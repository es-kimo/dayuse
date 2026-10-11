package com.dayuse.domain.coin.service

import com.dayuse.domain.analytics.service.ChallengeAnalyticsRecorder
import com.dayuse.domain.coin.*
import com.dayuse.domain.coin.dto.CoinBalanceResponse
import com.dayuse.domain.coin.dto.CoinLedgerMetricsResponse
import com.dayuse.domain.coin.dto.CoinTransactionResponse
import com.dayuse.domain.coin.dto.LedgerConsistencyResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

interface CoinTransactionService {
    fun getBalance(userId: Long): CoinBalanceResponse

    fun getTransactions(userId: Long, pageable: Pageable): Page<CoinTransactionResponse>

    fun getHeldTransactions(): List<CoinTransactionResponse>

    fun grantCoins(
        userId: Long,
        challengeId: Long,
        eligibleDates: Set<LocalDate>,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): List<CoinTransaction>

    fun adjustCoins(
        userId: Long,
        challengeId: Long?,
        targetDate: LocalDate,
        adjustmentAmount: Int,
        reason: String?,
        idempotencyKey: String? = null,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CoinTransaction

    fun approveHeldTransaction(
        transactionId: Long,
        adminUserId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CoinTransaction

    fun rejectHeldTransaction(
        transactionId: Long,
        adminUserId: Long,
        reason: String?,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CoinTransaction

    fun verifyLedgerConsistency(userId: Long): LedgerConsistencyResponse

    fun getLedgerMetrics(): CoinLedgerMetricsResponse
}

@Service
@Transactional
class CoinTransactionServiceImpl(
    private val coinBalanceRepository: CoinBalanceRepository,
    private val coinTransactionRepository: CoinTransactionRepository,
    private val coinEmergencyControlService: CoinEmergencyControlService,
    private val challengeAnalyticsRecorder: ChallengeAnalyticsRecorder? = null
) : CoinTransactionService {

    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional(readOnly = true)
    override fun getBalance(userId: Long): CoinBalanceResponse {
        val balance = coinBalanceRepository.findByUserId(userId).orElse(null)
            ?: return CoinBalanceResponse.empty(userId)
        return CoinBalanceResponse.from(balance)
    }

    @Transactional(readOnly = true)
    override fun getTransactions(userId: Long, pageable: Pageable): Page<CoinTransactionResponse> {
        return coinTransactionRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable)
            .map { CoinTransactionResponse.from(it) }
    }

    @Transactional(readOnly = true)
    override fun getHeldTransactions(): List<CoinTransactionResponse> {
        return coinTransactionRepository.findAllByStatusOrderByCreatedAtDesc(CoinTransactionStatus.HELD)
            .map { CoinTransactionResponse.from(it) }
    }

    /**
     * 챌린지 결과 확정 시 백그라운드 멱등적 자동 지급
     * - 날짜당 10코인 지급 (단일 챌린지 적격 기준)
     * - 중복 지급 방지: idempotencyKey 기반 사전 검사 + DB 유니크 제약
     * - 비상 킬스위치/이상 패턴 감지 시 HOLD로 격리
     */
    override fun grantCoins(
        userId: Long,
        challengeId: Long,
        eligibleDates: Set<LocalDate>,
        now: LocalDateTime
    ): List<CoinTransaction> {
        if (eligibleDates.isEmpty()) {
            return emptyList()
        }

        val grantedList = mutableListOf<CoinTransaction>()
        val balance = getOrCreateBalanceForUpdate(userId)

        for (targetDate in eligibleDates.sorted()) {
            val idempotencyKey = "GRANT:CHALLENGE:${challengeId}:USER:${userId}:DATE:${targetDate}"

            if (coinTransactionRepository.existsByIdempotencyKey(idempotencyKey)) {
                log.info("[grantCoins] IdempotencyKey already exists, skipping: {}", idempotencyKey)
                continue
            }

            val amount = CoinPolicy.DAILY_COIN_CAP
            val shouldHold = coinEmergencyControlService.shouldHold(userId, amount)

            val tx = if (shouldHold) {
                balance.addHeld(amount, now)
                CoinTransaction(
                    userId = userId,
                    type = CoinTransactionType.HOLD,
                    amount = amount,
                    balanceAfter = balance.availableBalance,
                    heldBalanceAfter = balance.heldBalance,
                    targetDate = targetDate,
                    challengeId = challengeId,
                    idempotencyKey = idempotencyKey,
                    status = CoinTransactionStatus.HELD,
                    reason = "비상 킬스위치 또는 이상 패턴에 의한 자동 보류 격리",
                    createdAt = now
                )
            } else {
                balance.addAvailable(amount, now)
                CoinTransaction(
                    userId = userId,
                    type = CoinTransactionType.GRANT,
                    amount = amount,
                    balanceAfter = balance.availableBalance,
                    heldBalanceAfter = balance.heldBalance,
                    targetDate = targetDate,
                    challengeId = challengeId,
                    idempotencyKey = idempotencyKey,
                    status = CoinTransactionStatus.COMPLETED,
                    reason = "챌린지(#${challengeId}) 적격 달성 자동 지급",
                    createdAt = now
                )
            }

            try {
                val savedTx = coinTransactionRepository.save(tx)
                grantedList.add(savedTx)
                if (savedTx.status == CoinTransactionStatus.COMPLETED) {
                    challengeAnalyticsRecorder?.challengeCoinGranted(
                        userId = userId,
                        challengeId = challengeId,
                        amount = savedTx.amount,
                        targetDate = targetDate
                    )
                }
            } catch (e: DataIntegrityViolationException) {
                log.warn("[grantCoins] Concurrent duplicate grant blocked by DB unique constraint: {}", idempotencyKey)
            }
        }

        coinBalanceRepository.save(balance)
        return grantedList
    }

    /**
     * 인증 취소/삭제에 따른 차액 보정 (PRD 5.4)
     * - 원장 불변성 원칙: 기존 행 수정 없이 신규 보정 행(ADJUSTMENT_ADD / ADJUSTMENT_SUB) 추가
     * - 잔액 M_end = M_start + I - S - R 동기화
     */
    override fun adjustCoins(
        userId: Long,
        challengeId: Long?,
        targetDate: LocalDate,
        adjustmentAmount: Int,
        reason: String?,
        idempotencyKey: String?,
        now: LocalDateTime
    ): CoinTransaction {
        if (adjustmentAmount == 0) {
            throw BadRequestException("보정 금액은 0일 수 없습니다.")
        }

        val balance = getOrCreateBalanceForUpdate(userId)
        val finalKey = idempotencyKey ?: "ADJUST:USER:${userId}:DATE:${targetDate}:AMT:${adjustmentAmount}:TIME:${now}"

        if (coinTransactionRepository.existsByIdempotencyKey(finalKey)) {
            return coinTransactionRepository.findByIdempotencyKey(finalKey).get()
        }

        val txType: CoinTransactionType
        val absAmount = Math.abs(adjustmentAmount)

        if (adjustmentAmount > 0) {
            txType = CoinTransactionType.ADJUSTMENT_ADD
            balance.addAvailable(absAmount, now)
        } else {
            txType = CoinTransactionType.ADJUSTMENT_SUB
            balance.subtractAvailable(absAmount, now)
        }

        val tx = CoinTransaction(
            userId = userId,
            type = txType,
            amount = absAmount,
            balanceAfter = balance.availableBalance,
            heldBalanceAfter = balance.heldBalance,
            targetDate = targetDate,
            challengeId = challengeId,
            idempotencyKey = finalKey,
            status = CoinTransactionStatus.COMPLETED,
            reason = reason ?: "인증 변경에 따른 차액 보정",
            createdAt = now
        )

        val savedTx = coinTransactionRepository.save(tx)
        coinBalanceRepository.save(balance)
        if (savedTx.status == CoinTransactionStatus.COMPLETED) {
            challengeAnalyticsRecorder?.challengeCoinAdjusted(
                userId = userId,
                challengeId = challengeId,
                transactionId = savedTx.id,
                amount = savedTx.amount,
                targetDate = targetDate,
                type = txType.name,
                balanceAfter = savedTx.balanceAfter
            )
        }
        return savedTx
    }

    /**
     * 보류 건 관리자 승인 (HOLD -> RELEASE)
     */
    override fun approveHeldTransaction(
        transactionId: Long,
        adminUserId: Long,
        now: LocalDateTime
    ): CoinTransaction {
        val heldTx = coinTransactionRepository.findById(transactionId).orElseThrow {
            ResourceNotFoundException("거래 내역을 찾을 수 없습니다. (ID: $transactionId)")
        }

        if (heldTx.status != CoinTransactionStatus.HELD) {
            throw BadRequestException("보류(HELD) 상태의 거래만 승인할 수 있습니다. (현재: ${heldTx.status})")
        }

        val balance = getOrCreateBalanceForUpdate(heldTx.userId)
        balance.releaseHeld(heldTx.amount, now)
        heldTx.markReleased(adminUserId, now)

        // 원장에 명시적인 RELEASE 기록 생성
        val releaseTx = CoinTransaction(
            userId = heldTx.userId,
            type = CoinTransactionType.RELEASE,
            amount = heldTx.amount,
            balanceAfter = balance.availableBalance,
            heldBalanceAfter = balance.heldBalance,
            targetDate = heldTx.targetDate,
            challengeId = heldTx.challengeId,
            verificationId = heldTx.verificationId,
            idempotencyKey = "RELEASE:TX:${heldTx.id}",
            status = CoinTransactionStatus.COMPLETED,
            reason = "관리자(ID: $adminUserId) 검토 승인 및 보류 해제",
            reviewedBy = adminUserId,
            reviewedAt = now,
            createdAt = now
        )

        coinBalanceRepository.save(balance)
        return coinTransactionRepository.save(releaseTx)
    }

    /**
     * 보류 건 관리자 반려 (HOLD -> REJECT)
     */
    override fun rejectHeldTransaction(
        transactionId: Long,
        adminUserId: Long,
        reason: String?,
        now: LocalDateTime
    ): CoinTransaction {
        val heldTx = coinTransactionRepository.findById(transactionId).orElseThrow {
            ResourceNotFoundException("거래 내역을 찾을 수 없습니다. (ID: $transactionId)")
        }

        if (heldTx.status != CoinTransactionStatus.HELD) {
            throw BadRequestException("보류(HELD) 상태의 거래만 반려할 수 있습니다. (현재: ${heldTx.status})")
        }

        val balance = getOrCreateBalanceForUpdate(heldTx.userId)
        balance.rejectHeld(heldTx.amount, now)
        heldTx.markRejected(adminUserId, reason, now)

        val rejectTx = CoinTransaction(
            userId = heldTx.userId,
            type = CoinTransactionType.REJECT,
            amount = heldTx.amount,
            balanceAfter = balance.availableBalance,
            heldBalanceAfter = balance.heldBalance,
            targetDate = heldTx.targetDate,
            challengeId = heldTx.challengeId,
            verificationId = heldTx.verificationId,
            idempotencyKey = "REJECT:TX:${heldTx.id}",
            status = CoinTransactionStatus.REJECTED,
            reason = reason ?: "관리자(ID: $adminUserId) 검토 반려",
            reviewedBy = adminUserId,
            reviewedAt = now,
            createdAt = now
        )

        coinBalanceRepository.save(balance)
        return coinTransactionRepository.save(rejectTx)
    }

    /**
     * 원장 정합성 검증: M_end = M_start + I - S - R
     */
    @Transactional(readOnly = true)
    override fun verifyLedgerConsistency(userId: Long): LedgerConsistencyResponse {
        val balance = coinBalanceRepository.findByUserId(userId).orElse(null)
        val currentAvailable = balance?.availableBalance ?: 0
        val currentHeld = balance?.heldBalance ?: 0

        val transactions = coinTransactionRepository.findAllByUserId(userId)

        var calculatedAvailable = 0
        var calculatedHeld = 0

        for (tx in transactions) {
            when (tx.type) {
                CoinTransactionType.GRANT -> {
                    if (tx.status == CoinTransactionStatus.COMPLETED) {
                        calculatedAvailable += tx.amount
                    }
                }
                CoinTransactionType.ADJUSTMENT_ADD -> {
                    if (tx.status == CoinTransactionStatus.COMPLETED) {
                        calculatedAvailable += tx.amount
                    }
                }
                CoinTransactionType.ADJUSTMENT_SUB -> {
                    if (tx.status == CoinTransactionStatus.COMPLETED) {
                        calculatedAvailable -= tx.amount
                    }
                }
                CoinTransactionType.HOLD -> {
                    // 최초 HOLD 발생 시 heldBalance 증가
                    calculatedHeld += tx.amount
                }
                CoinTransactionType.RELEASE -> {
                    if (tx.status == CoinTransactionStatus.COMPLETED) {
                        calculatedHeld -= tx.amount
                        calculatedAvailable += tx.amount
                    }
                }
                CoinTransactionType.REJECT -> {
                    calculatedHeld -= tx.amount
                }
            }
        }

        val isConsistent = (currentAvailable == calculatedAvailable) && (currentHeld == calculatedHeld)

        return LedgerConsistencyResponse(
            userId = userId,
            isConsistent = isConsistent,
            availableBalance = currentAvailable,
            calculatedAvailableFromLedger = calculatedAvailable,
            heldBalance = currentHeld,
            calculatedHeldFromLedger = calculatedHeld,
            transactionCount = transactions.size
        )
    }

    /**
     * 관리자/내부 점검용 원장 지표 집계 (F09, 5.3.6)
     * - 총 발행량 (I), 보정 추가, 차감 (R), 소비 (S=0), 미사용 잔액 (M)
     * - M_end = M_start + I - S - R 검증
     * - 상품별(티셔츠 3,600코인, 후디 7,200코인) 가격 도달 계정 수 집계
     */
    @Transactional(readOnly = true)
    override fun getLedgerMetrics(): CoinLedgerMetricsResponse {
        val totalGranted = coinTransactionRepository.sumAmountByTypeAndStatus(
            CoinTransactionType.GRANT,
            CoinTransactionStatus.COMPLETED
        )
        val totalAdjustedAdd = coinTransactionRepository.sumAmountByTypeAndStatus(
            CoinTransactionType.ADJUSTMENT_ADD,
            CoinTransactionStatus.COMPLETED
        )
        val totalAdjustedSub = coinTransactionRepository.sumAmountByTypeAndStatus(
            CoinTransactionType.ADJUSTMENT_SUB,
            CoinTransactionStatus.COMPLETED
        )
        val totalSpent = 0L
        val totalAvailableBalance = coinBalanceRepository.sumTotalAvailableBalance()
        val totalHeldBalance = coinBalanceRepository.sumTotalHeldBalance()

        val expectedAvailable = totalGranted + totalAdjustedAdd - totalAdjustedSub - totalSpent
        val isConsistent = (expectedAvailable == totalAvailableBalance)

        val totalAccounts = coinBalanceRepository.count()
        val tshirtGoalReachedUsers = coinBalanceRepository.countUsersWithAvailableBalanceAtLeast(3600)
        val hoodieGoalReachedUsers = coinBalanceRepository.countUsersWithAvailableBalanceAtLeast(7200)

        return CoinLedgerMetricsResponse(
            totalGranted = totalGranted,
            totalAdjustedAdd = totalAdjustedAdd,
            totalAdjustedSub = totalAdjustedSub,
            totalSpent = totalSpent,
            totalAvailableBalance = totalAvailableBalance,
            totalHeldBalance = totalHeldBalance,
            isLedgerConsistent = isConsistent,
            totalAccounts = totalAccounts,
            tshirtGoalTarget = 3600,
            tshirtGoalReachedUsers = tshirtGoalReachedUsers,
            hoodieGoalTarget = 7200,
            hoodieGoalReachedUsers = hoodieGoalReachedUsers
        )
    }

    private fun getOrCreateBalanceForUpdate(userId: Long): CoinBalance {
        val existing = coinBalanceRepository.findByUserIdForUpdate(userId)
        if (existing.isPresent) {
            return existing.get()
        }
        return try {
            coinBalanceRepository.saveAndFlush(CoinBalance(userId = userId))
        } catch (e: Exception) {
            coinBalanceRepository.findByUserIdForUpdate(userId).orElseThrow { e }
        }
    }
}
