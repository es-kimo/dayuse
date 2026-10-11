package com.dayuse.domain.coin

import com.dayuse.domain.coin.service.CoinEmergencyControlService
import com.dayuse.domain.coin.service.CoinTransactionService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@ActiveProfiles("test")
class CoinConcurrencyTest @Autowired constructor(
    private val coinTransactionService: CoinTransactionService,
    private val coinBalanceRepository: CoinBalanceRepository,
    private val coinTransactionRepository: CoinTransactionRepository,
    private val coinEmergencyControlService: CoinEmergencyControlService
) {
    private val userId = 500L
    private val challengeId = 99L
    private val now = LocalDateTime.of(2026, 10, 11, 15, 0, 0)

    @BeforeEach
    fun setUp() {
        coinEmergencyControlService.setKillSwitch(false, "동시성 테스트 초기화")
        coinTransactionRepository.deleteAll()
        coinBalanceRepository.deleteAll()
        coinBalanceRepository.save(CoinBalance(userId = userId))
    }

    @Test
    @DisplayName("동일 챌린지·동일 날짜에 대해 10개의 스레드가 동시에 grantCoins를 호출해도 멱등키와 락으로 인해 정확히 1회(10코인)만 지급된다")
    fun concurrentGrantSameDate() {
        val threadCount = 10
        val executor = Executors.newFixedThreadPool(threadCount)
        val latch = CountDownLatch(threadCount)
        val targetDate = LocalDate.of(2026, 10, 1)

        val successCount = AtomicInteger(0)

        for (i in 0 until threadCount) {
            executor.submit {
                try {
                    val granted = coinTransactionService.grantCoins(
                        userId = userId,
                        challengeId = challengeId,
                        eligibleDates = setOf(targetDate),
                        now = now
                    )
                    if (granted.isNotEmpty()) {
                        successCount.incrementAndGet()
                    }
                } catch (e: Exception) {
                    // 동시성 제약조건에 의한 예외 또는 정상 처리
                } finally {
                    latch.countDown()
                }
            }
        }

        latch.await()
        executor.shutdown()

        // 결과 검증: 원장 트랜잭션은 정확히 1개여야 함
        val transactions = coinTransactionRepository.findAllByUserId(userId)
        assertThat(transactions).hasSize(1)
        assertThat(transactions[0].amount).isEqualTo(10)

        // 잔액도 정확히 10이어야 함
        val balance = coinTransactionService.getBalance(userId)
        assertThat(balance.availableBalance).isEqualTo(10)

        // 원장 정합성 검증
        val consistency = coinTransactionService.verifyLedgerConsistency(userId)
        assertThat(consistency.isConsistent).isTrue()
    }

    @Test
    @DisplayName("서로 다른 5개 날짜에 대해 동시에 5개 스레드가 각각 grantCoins를 호출해도 잔액 갱신 분실(Lost Update) 없이 50코인이 누적된다")
    fun concurrentGrantDifferentDates() {
        val dates = listOf(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 2),
            LocalDate.of(2026, 10, 3),
            LocalDate.of(2026, 10, 4),
            LocalDate.of(2026, 10, 5)
        )
        val threadCount = dates.size
        val executor = Executors.newFixedThreadPool(threadCount)
        val latch = CountDownLatch(threadCount)

        for (date in dates) {
            executor.submit {
                try {
                    coinTransactionService.grantCoins(
                        userId = userId,
                        challengeId = challengeId,
                        eligibleDates = setOf(date),
                        now = now
                    )
                } catch (e: Exception) {
                    println("Thread error for date $date: ${e.javaClass.name}: ${e.message}")
                    e.printStackTrace()
                } finally {
                    latch.countDown()
                }
            }
        }

        latch.await()
        executor.shutdown()

        // 5개 날짜 모두 정상 저장
        val transactions = coinTransactionRepository.findAllByUserId(userId)
        assertThat(transactions).hasSize(5)

        // 잔액이 분실 없이 50이어야 함
        val balance = coinTransactionService.getBalance(userId)
        assertThat(balance.availableBalance).isEqualTo(50)

        val consistency = coinTransactionService.verifyLedgerConsistency(userId)
        assertThat(consistency.isConsistent).isTrue()
        assertThat(consistency.calculatedAvailableFromLedger).isEqualTo(50)
    }
}
