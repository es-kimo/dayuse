package com.dayuse.domain.coin

import com.dayuse.domain.coin.dto.CoinBalanceResponse
import com.dayuse.domain.coin.service.CoinEmergencyControlService
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.domain.coin.service.CoinTransactionServiceImpl
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ResourceNotFoundException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.context.annotation.Import
import java.time.LocalDate
import java.time.LocalDateTime

@DataJpaTest
@Import(CoinEmergencyControlService::class)
class CoinTransactionServiceTest @Autowired constructor(
    private val coinBalanceRepository: CoinBalanceRepository,
    private val coinTransactionRepository: CoinTransactionRepository,
    private val coinEmergencyControlService: CoinEmergencyControlService
) {
    private lateinit var coinTransactionService: CoinTransactionService
    private val now = LocalDateTime.of(2026, 10, 11, 12, 0, 0)
    private val userId = 100L
    private val challengeId = 1L

    @BeforeEach
    fun setUp() {
        coinEmergencyControlService.setKillSwitch(false, "테스트 초기화")
        coinTransactionService = CoinTransactionServiceImpl(
            coinBalanceRepository = coinBalanceRepository,
            coinTransactionRepository = coinTransactionRepository,
            coinEmergencyControlService = coinEmergencyControlService
        )
    }

    @Nested
    @DisplayName("멱등적 코인 자동 지급 (grantCoins)")
    inner class GrantCoinsTest {

        @Test
        @DisplayName("적격 날짜 3일에 대해 각 10코인씩 총 30코인이 정상 지급되고 잔액에 반영된다")
        fun grantCoinsSuccessfully() {
            val dates = setOf(
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 2),
                LocalDate.of(2026, 10, 3)
            )

            val granted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = dates,
                now = now
            )

            assertThat(granted).hasSize(3)
            assertThat(granted).allMatch { it.status == CoinTransactionStatus.COMPLETED }
            assertThat(granted).allMatch { it.type == CoinTransactionType.GRANT }
            assertThat(granted).allMatch { it.amount == 10 }

            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.availableBalance).isEqualTo(30)
            assertThat(balance.heldBalance).isEqualTo(0)

            // 원장 정합성 검증
            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.calculatedAvailableFromLedger).isEqualTo(30)
        }

        @Test
        @DisplayName("동일 챌린지와 날짜에 대해 재호출되어도 멱등키에 의해 중복 지급되지 않는다")
        fun idempotentGrantCoins() {
            val dates = setOf(LocalDate.of(2026, 10, 1))

            // 1차 지급
            val firstGranted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = dates,
                now = now
            )
            assertThat(firstGranted).hasSize(1)

            // 2차 중복 시도
            val secondGranted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = dates,
                now = now.plusMinutes(5)
            )
            assertThat(secondGranted).isEmpty()

            // 잔액은 여전히 10코인 유지
            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.availableBalance).isEqualTo(10)
        }

        @Test
        @DisplayName("비상 킬스위치가 활성화되어 있으면 자동 지급 대신 HOLD 상태로 격리된다")
        fun holdWhenKillSwitchActive() {
            coinEmergencyControlService.setKillSwitch(true, "긴급 점검")

            val dates = setOf(LocalDate.of(2026, 10, 1))
            val granted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = dates,
                now = now
            )

            assertThat(granted).hasSize(1)
            assertThat(granted[0].type == CoinTransactionType.HOLD).isTrue()
            assertThat(granted[0].status == CoinTransactionStatus.HELD).isTrue()

            val balance = coinTransactionService.getBalance(userId)
            // 보류된 코인은 사용 가능 잔액에 미포함
            assertThat(balance.availableBalance).isEqualTo(0)
            assertThat(balance.heldBalance).isEqualTo(10)
            assertThat(balance.totalBalance).isEqualTo(10)

            // 원장 일치성 검증
            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.heldBalance).isEqualTo(10)
        }
    }

    @Nested
    @DisplayName("원장 불변 차액 보정 (adjustCoins)")
    inner class AdjustCoinsTest {

        @Test
        @DisplayName("기존 30코인 지급 상태에서 추가 인증 인정으로 +10코인 보정 시 ADJUSTMENT_ADD 트랜잭션이 추가된다")
        fun adjustCoinsAdd() {
            val dates = setOf(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2), LocalDate.of(2026, 10, 3))
            coinTransactionService.grantCoins(userId, challengeId, dates, now)

            val adjustTx = coinTransactionService.adjustCoins(
                userId = userId,
                challengeId = challengeId,
                targetDate = LocalDate.of(2026, 10, 4),
                adjustmentAmount = 10,
                reason = "수기 누락 인증 인정 추가 지급",
                now = now.plusHours(1)
            )

            assertThat(adjustTx.type).isEqualTo(CoinTransactionType.ADJUSTMENT_ADD)
            assertThat(adjustTx.amount).isEqualTo(10)
            assertThat(adjustTx.balanceAfter).isEqualTo(40)

            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.availableBalance).isEqualTo(40)

            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.calculatedAvailableFromLedger).isEqualTo(40)
        }

        @Test
        @DisplayName("인증 삭제/취소로 인해 -10코인 보정 시 기존 행을 수정하지 않고 ADJUSTMENT_SUB 트랜잭션이 추가된다")
        fun adjustCoinsSubtract() {
            val dates = setOf(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2))
            coinTransactionService.grantCoins(userId, challengeId, dates, now)

            val adjustTx = coinTransactionService.adjustCoins(
                userId = userId,
                challengeId = challengeId,
                targetDate = LocalDate.of(2026, 10, 1),
                adjustmentAmount = -10,
                reason = "부정 인증 확인으로 인한 차감",
                now = now.plusHours(2)
            )

            assertThat(adjustTx.type).isEqualTo(CoinTransactionType.ADJUSTMENT_SUB)
            assertThat(adjustTx.amount).isEqualTo(10)
            assertThat(adjustTx.balanceAfter).isEqualTo(10)

            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.availableBalance).isEqualTo(10)

            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.calculatedAvailableFromLedger).isEqualTo(10)
        }

        @Test
        @DisplayName("차감액이 현재 가용 잔액보다 크면 BadRequestException이 발생한다")
        fun failWhenInsufficientBalance() {
            val dates = setOf(LocalDate.of(2026, 10, 1))
            coinTransactionService.grantCoins(userId, challengeId, dates, now) // 10 코인

            assertThatThrownBy {
                coinTransactionService.adjustCoins(
                    userId = userId,
                    challengeId = challengeId,
                    targetDate = LocalDate.of(2026, 10, 1),
                    adjustmentAmount = -20,
                    reason = "초과 차감 시도",
                    now = now.plusHours(1)
                )
            }.isInstanceOf(BadRequestException::class.java)
        }
    }

    @Nested
    @DisplayName("관리자 보류 검토 및 승인/반려 (approveHeld / rejectHeld)")
    inner class HeldReviewTest {

        @Test
        @DisplayName("보류 건을 관리자가 승인하면 heldBalance가 availableBalance로 이동하고 RELEASE 원장이 기록된다")
        fun approveHeldSuccessfully() {
            coinEmergencyControlService.setKillSwitch(true, "점검")
            val granted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = setOf(LocalDate.of(2026, 10, 1)),
                now = now
            )
            val heldTx = granted[0]

            val releaseTx = coinTransactionService.approveHeldTransaction(
                transactionId = heldTx.id,
                adminUserId = 999L,
                now = now.plusDays(1)
            )

            assertThat(releaseTx.type).isEqualTo(CoinTransactionType.RELEASE)
            assertThat(releaseTx.amount).isEqualTo(10)
            assertThat(releaseTx.status).isEqualTo(CoinTransactionStatus.COMPLETED)

            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.heldBalance).isEqualTo(0)
            assertThat(balance.availableBalance).isEqualTo(10)

            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.availableBalance).isEqualTo(10)
            assertThat(consistency.heldBalance).isEqualTo(0)
        }

        @Test
        @DisplayName("보류 건을 관리자가 반려하면 heldBalance에서 차감되고 REJECT 원장이 기록된다")
        fun rejectHeldSuccessfully() {
            coinEmergencyControlService.setKillSwitch(true, "점검")
            val granted = coinTransactionService.grantCoins(
                userId = userId,
                challengeId = challengeId,
                eligibleDates = setOf(LocalDate.of(2026, 10, 1)),
                now = now
            )
            val heldTx = granted[0]

            val rejectTx = coinTransactionService.rejectHeldTransaction(
                transactionId = heldTx.id,
                adminUserId = 999L,
                reason = "이상 패턴 확인으로 지급 취소",
                now = now.plusDays(1)
            )

            assertThat(rejectTx.type).isEqualTo(CoinTransactionType.REJECT)
            assertThat(rejectTx.amount).isEqualTo(10)
            assertThat(rejectTx.status).isEqualTo(CoinTransactionStatus.REJECTED)

            val balance = coinTransactionService.getBalance(userId)
            assertThat(balance.heldBalance).isEqualTo(0)
            assertThat(balance.availableBalance).isEqualTo(0)

            val consistency = coinTransactionService.verifyLedgerConsistency(userId)
            assertThat(consistency.isConsistent).isTrue()
            assertThat(consistency.availableBalance).isEqualTo(0)
            assertThat(consistency.heldBalance).isEqualTo(0)
        }
    }
}
