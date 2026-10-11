package com.dayuse.domain.coin.service

import com.dayuse.domain.coin.*
import com.dayuse.domain.coin.dto.CoinBalanceResponse
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
}

@Service
@Transactional
class CoinTransactionServiceImpl(
    private val coinBalanceRepository: CoinBalanceRepository,
    private val coinTransactionRepository: CoinTransactionRepository,
    private val coinEmergencyControlService: CoinEmergencyControlService
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
        // TODO [사용자 미션 1]: 멱등성을 보장하는 백그라운드 자동 코인 지급 엔진
        // 1. eligibleDates가 비어있으면 emptyList() 반환
        // 2. userId에 대한 CoinBalance를 getOrCreateBalanceForUpdate(userId)로 비관적 락 조회
        // 3. eligibleDates의 각 날짜(sorted)에 대해:
        //    - 멱등키 생성: "GRANT:CHALLENGE:${challengeId}:USER:${userId}:DATE:${targetDate}"
        //    - coinTransactionRepository.existsByIdempotencyKey(key) 검사 -> 존재 시 중복 지급 건너뜀(continue)
        //    - 지급 수량은 CoinPolicy.DAILY_COIN_CAP(10코인)
        //    - coinEmergencyControlService.shouldHold(userId, amount) 검사:
        //      * true(보류): balance.addHeld, type=CoinTransactionType.HOLD, status=CoinTransactionStatus.HELD
        //      * false(정상): balance.addAvailable, type=CoinTransactionType.GRANT, status=CoinTransactionStatus.COMPLETED
        //    - DataIntegrityViolationException 예외 대비(try-catch)하며 트랜잭션 저장 및 반환 목록 누적
        // 4. balance 저장 후 지급된 트랜잭션 목록 반환
        return emptyList()
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
        // TODO [사용자 미션 2]: 원장 불변성 기반 차액 보정 엔진 (Append-Only)
        // 1. adjustmentAmount == 0 이면 BadRequestException("보정 금액은 0일 수 없습니다.") 던짐
        // 2. getOrCreateBalanceForUpdate(userId)로 락 획득
        // 3. idempotencyKey 검사 (null이면 "ADJUST:USER:${userId}:DATE:${targetDate}:AMT:${adjustmentAmount}:TIME:${now}" 기본 키 생성)
        //    - 이미 동일 멱등키가 존재하면 findByIdempotencyKey로 기존 트랜잭션 반환
        // 4. adjustmentAmount 부호에 따른 분기:
        //    - adjustmentAmount > 0: type=ADJUSTMENT_ADD, balance.addAvailable(absAmount, now)
        //    - adjustmentAmount < 0: type=ADJUSTMENT_SUB, balance.subtractAvailable(absAmount, now) (잔액 부족 시 방어)
        // 5. 새 CoinTransaction 행 생성(balanceAfter, heldBalanceAfter 스냅샷 포함) 및 저장 후 반환
        throw NotImplementedError("사용자 미션 2 구현 대상입니다.")
    }

    /**
     * 보류 건 관리자 승인 (HOLD -> RELEASE)
     */
    override fun approveHeldTransaction(
        transactionId: Long,
        adminUserId: Long,
        now: LocalDateTime
    ): CoinTransaction {
        // TODO [사용자 미션 3-1]: 관리자 보류 승인 및 RELEASE 원장 기록
        // 1. transactionId 조회, 거래 상태가 HELD가 아니면 BadRequestException("보류(HELD) 상태의 거래만 승인할 수 있습니다...") 던짐
        // 2. getOrCreateBalanceForUpdate로 락 획득 후 balance.releaseHeld(heldTx.amount, now)
        // 3. heldTx.markReleased(adminUserId, now)
        // 4. type=RELEASE, status=COMPLETED인 신규 원장 행 생성 및 저장 후 반환
        throw NotImplementedError("사용자 미션 3-1 구현 대상입니다.")
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
        // TODO [사용자 미션 3-2]: 관리자 보류 반려 및 REJECT 원장 기록
        // 1. transactionId 조회, 거래 상태가 HELD가 아니면 BadRequestException("보류(HELD) 상태의 거래만 반려할 수 있습니다...") 던짐
        // 2. getOrCreateBalanceForUpdate로 락 획득 후 balance.rejectHeld(heldTx.amount, now)
        // 3. heldTx.markRejected(adminUserId, reason, now)
        // 4. type=REJECT, status=REJECTED인 신규 원장 행 생성 및 저장 후 반환
        throw NotImplementedError("사용자 미션 3-2 구현 대상입니다.")
    }

    /**
     * 원장 정합성 검증: M_end = M_start + I - S - R
     */
    @Transactional(readOnly = true)
    override fun verifyLedgerConsistency(userId: Long): LedgerConsistencyResponse {
        // TODO [사용자 미션 3-3]: 원장 합계 공식(M_end = M_start + I - S - R) 일치성 검증
        // 1. CoinBalance에서 현재 availableBalance, heldBalance 조회 (없으면 0)
        // 2. coinTransactionRepository.findAllByUserId(userId)로 전체 원장 순회하며 계산:
        //    - GRANT: COMPLETED 시 calculatedAvailable += tx.amount
        //    - ADJUSTMENT_ADD: COMPLETED 시 calculatedAvailable += tx.amount
        //    - ADJUSTMENT_SUB: COMPLETED 시 calculatedAvailable -= tx.amount
        //    - HOLD: calculatedHeld += tx.amount
        //    - RELEASE: COMPLETED 시 calculatedHeld -= tx.amount, calculatedAvailable += tx.amount
        //    - REJECT: calculatedHeld -= tx.amount
        // 3. isConsistent = (currentAvailable == calculatedAvailable) && (currentHeld == calculatedHeld)
        // 4. LedgerConsistencyResponse 반환
        return LedgerConsistencyResponse(
            userId = userId,
            isConsistent = false,
            availableBalance = 0,
            calculatedAvailableFromLedger = 0,
            heldBalance = 0,
            calculatedHeldFromLedger = 0,
            transactionCount = 0
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
