package com.dayuse.domain.coin

import com.dayuse.domain.challenge.result.ChallengeResultStatus
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Nested
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.LocalDateTime

@DisplayName("코인 자격 및 발행 상한 검증 계산기 단위 테스트 (CoinEligibilityCalculatorTest)")
class CoinEligibilityCalculatorTest {

    private val baseNow = LocalDateTime.of(2026, 10, 11, 12, 0)
    private val today = baseNow.toLocalDate()
    private val userCreatedAt = LocalDateTime.of(2026, 9, 1, 0, 0)
    private val participantStartDate = LocalDate.of(2026, 9, 15)

    private fun createDefaultContext(
        userId: Long = 1L,
        userCreatedAt: LocalDateTime = this.userCreatedAt,
        participantStartDate: LocalDate = this.participantStartDate,
        challengeStatus: ChallengeResultStatus = ChallengeResultStatus.CONFIRMED
    ) = ParticipantCoinContext(
        userId = userId,
        userCreatedAt = userCreatedAt,
        participantStartDate = participantStartDate,
        challengeStatus = challengeStatus
    )

    @Nested
    @DisplayName("[미션 1] 부정 적립 기초 방어 (F11, 5.3.7)")
    inner class FraudPreventionTests {

        @Test
        @DisplayName("챌린지가 CONFIRMED(정상 종료 확정) 상태가 아니면 모든 인증이 거절된다")
        fun rejectWhenChallengeNotConfirmed() {
            val context = createDefaultContext(challengeStatus = ChallengeResultStatus.PROVISIONAL)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = today.minusDays(1),
                submittedAt = baseNow.minusDays(1)
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.eligibleDates).isEmpty()
            assertThat(result.rejectedDates[candidate.targetDate])
                .isEqualTo(CoinRejectionReason.CHALLENGE_NOT_CONFIRMED)
        }

        @Test
        @DisplayName("현재 KST 시각 기준 미래 날짜 인증은 FUTURE_DATE로 거절된다")
        fun rejectFutureDate() {
            val context = createDefaultContext()
            val futureTargetDate = today.plusDays(1)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = futureTargetDate,
                submittedAt = baseNow
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[futureTargetDate]).isEqualTo(CoinRejectionReason.FUTURE_DATE)
        }

        @Test
        @DisplayName("서버 KST 접수일보다 미래 날짜를 targetDate로 주장한 경우(클라이언트 조작) FUTURE_DATE로 거절된다")
        fun rejectTargetDateAheadOfSubmittedAt() {
            val context = createDefaultContext()
            val targetDate = today.minusDays(2)
            // 서버 접수는 3일 전인데 수행일은 2일 전이라고 주장한 비정상 케이스
            val submittedAt = baseNow.minusDays(3)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = targetDate,
                submittedAt = submittedAt
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[targetDate]).isEqualTo(CoinRejectionReason.FUTURE_DATE)
        }

        @Test
        @DisplayName("계정 생성일(userCreatedAt) 이전 날짜 인증은 BEFORE_USER_CREATED로 거절된다")
        fun rejectBeforeUserCreated() {
            val context = createDefaultContext()
            val invalidDate = userCreatedAt.toLocalDate().minusDays(1)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = invalidDate,
                submittedAt = baseNow.minusDays(40)
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[invalidDate]).isEqualTo(CoinRejectionReason.BEFORE_USER_CREATED)
        }

        @Test
        @DisplayName("참가 효력 발생일(participantStartDate) 이전 날짜 인증은 BEFORE_PARTICIPANT_JOINED로 거절된다")
        fun rejectBeforeParticipantJoined() {
            val context = createDefaultContext()
            val invalidDate = participantStartDate.minusDays(1)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = invalidDate,
                submittedAt = baseNow.minusDays(27)
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[invalidDate]).isEqualTo(CoinRejectionReason.BEFORE_PARTICIPANT_JOINED)
        }

        @Test
        @DisplayName("지각 인증(isLate = true)은 LATE_VERIFICATION으로 코인 지급에서 제외된다")
        fun rejectLateVerification() {
            val context = createDefaultContext()
            val targetDate = today.minusDays(3)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = targetDate,
                submittedAt = baseNow.minusDays(2),
                isLate = true
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[targetDate]).isEqualTo(CoinRejectionReason.LATE_VERIFICATION)
        }

        @Test
        @DisplayName("리데이 티켓 적용 인증(isRedayApplied = true)은 REDAY_APPLIED로 코인 지급에서 제외된다")
        fun rejectRedayAppliedVerification() {
            val context = createDefaultContext()
            val targetDate = today.minusDays(3)
            val candidate = CandidateVerification(
                verificationId = 1L,
                targetDate = targetDate,
                submittedAt = baseNow.minusDays(2),
                isLate = false,
                isRedayApplied = true
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[targetDate]).isEqualTo(CoinRejectionReason.REDAY_APPLIED)
        }
    }

    @Nested
    @DisplayName("[미션 2] 동일 날짜 10코인 캡 및 중복 제거 (F05, 5.3.1, 5.3.2)")
    inner class DailyCapTests {

        @Test
        @DisplayName("동일 날짜에 하루 여러 번 수행하거나 사진을 여러 장 등록해도 10코인만 인정된다")
        fun singleDayMultipleSubmissionsCappedAt10Coins() {
            val context = createDefaultContext()
            val targetDate = today.minusDays(2)

            val candidates = listOf(
                CandidateVerification(1L, targetDate, baseNow.minusDays(2).plusHours(9)),
                CandidateVerification(2L, targetDate, baseNow.minusDays(2).plusHours(14)),
                CandidateVerification(3L, targetDate, baseNow.minusDays(2).plusHours(20))
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = candidates,
                now = baseNow
            )

            assertThat(result.eligibleDates).containsExactly(targetDate)
            assertThat(result.awardedCoins).isEqualTo(10)
            assertThat(result.cappedDates).contains(targetDate)
        }

        @Test
        @DisplayName("계정이 타 챌린지를 통해 이미 해당 날짜에 10코인을 획득한 경우 ALREADY_GRANTED로 0코인 추가된다")
        fun rejectWhenAlreadyGrantedOnSameDate() {
            val context = createDefaultContext()
            val targetDate = today.minusDays(5)

            val candidates = listOf(
                CandidateVerification(1L, targetDate, baseNow.minusDays(5))
            )

            val existingCoins = mapOf(targetDate to 10)

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = candidates,
                existingAwardedCoinsByDate = existingCoins,
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.eligibleDates).isEmpty()
            assertThat(result.cappedDates).contains(targetDate)
            assertThat(result.rejectedDates[targetDate]).isEqualTo(CoinRejectionReason.ALREADY_GRANTED)
        }

        @Test
        @DisplayName("과거 폐기 정책(수행횟수x10 + 완주 20% 등)이 적용되지 않고 순수 인정 날짜수 x 10코인이 지급된다")
        fun verifyNoLegacyCompletionBonusApplied() {
            val context = createDefaultContext()
            val date1 = today.minusDays(3)
            val date2 = today.minusDays(2)

            val candidates = listOf(
                CandidateVerification(1L, date1, baseNow.minusDays(3)),
                CandidateVerification(2L, date2, baseNow.minusDays(2))
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = candidates,
                now = baseNow
            )

            // 2일 * 10 = 20코인 (완주 보너스 20%나 추가 가산 없음)
            assertThat(result.awardedCoins).isEqualTo(20)
            assertThat(result.eligibleDates).containsExactlyInAnyOrder(date1, date2)
        }
    }

    @Nested
    @DisplayName("[미션 3] 30일(최대 300) / 365일(최대 3,650) 수행일 기준 상한 검증 (F11, 5.3.3)")
    inner class WindowCapTests {

        @Test
        @DisplayName("30일 연속 수행 시 정확히 300코인(30일 x 10코인)을 획득한다")
        fun exactly300CoinsFor30ConsecutiveDays() {
            val context = createDefaultContext(
                participantStartDate = today.minusDays(40)
            )

            val candidates = (1..30).map { dayOffset ->
                val date = today.minusDays(dayOffset.toLong())
                CandidateVerification(
                    verificationId = dayOffset.toLong(),
                    targetDate = date,
                    submittedAt = baseNow.minusDays(dayOffset.toLong())
                )
            }

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = candidates,
                now = baseNow
            )

            assertThat(result.eligibleDates).hasSize(30)
            assertThat(result.awardedCoins).isEqualTo(300)
            assertThat(result.rejectedDates).isEmpty()
        }

        @Test
        @DisplayName("어떤 30일 윈도우 내에 이미 300코인이 적립되어 있다면 31번째 날짜는 EXCEEDS_30_DAY_CAP으로 차단된다")
        fun rejectWhen30DayWindowCapExceeded() {
            val context = createDefaultContext(
                participantStartDate = today.minusDays(40)
            )

            // 30일 윈도우 [today - 29, today] 내에 이미 300코인이 적립되어 있는 상태 (예: 과거 보정 등으로 29개 날짜 합계가 이미 300코인)
            val existingCoins = (1..29).associate { dayOffset ->
                today.minusDays(dayOffset.toLong()) to 10
            }.toMutableMap().apply {
                this[today.minusDays(1)] = 20 // 28개 * 10 + 1개 * 20 = 300코인
            }

            val candidate = CandidateVerification(101L, today, baseNow)

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(candidate),
                existingAwardedCoinsByDate = existingCoins,
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[today]).isEqualTo(CoinRejectionReason.EXCEEDS_30_DAY_CAP)
        }

        @Test
        @DisplayName("365일 윈도우 내에 이미 3,650코인이 적립되어 있다면 추가 날짜는 EXCEEDS_365_DAY_CAP으로 차단된다")
        fun rejectWhen365DayWindowCapExceeded() {
            val context = createDefaultContext(
                userCreatedAt = baseNow.minusDays(400),
                participantStartDate = today.minusDays(380)
            )

            // 최근 10일간은 수행 이력이 없어 30일 윈도우는 여유가 있지만,
            // 365일 윈도우 [today - 364, today] 전체 누적 합계는 이미 3,650코인에 도달한 상황
            val existingCoins = mutableMapOf<LocalDate, Int>()
            // [today - 29, today - 11] 구간: 19일 * 10 = 190코인 (30일 윈도우는 190 + 10 = 200코인으로 300 미만)
            for (offset in 11..29) {
                existingCoins[today.minusDays(offset.toLong())] = 10
            }
            // 나머지 과거 구간에 3,460코인을 적립하여 365일 윈도우 총합 3,650코인 달성 (과거 보정 반영)
            // (115개 날짜에 30코인씩 분산 -> 각 30일 윈도우는 300 이하 유지)
            for (offset in 35..149) {
                existingCoins[today.minusDays(offset.toLong())] = 30
            }
            existingCoins[today.minusDays(150)] = 10
            // 총합: 190 + (115 * 30) + 10 = 190 + 3450 + 10 = 3650코인

            val newCandidate = CandidateVerification(1L, today, baseNow)

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = listOf(newCandidate),
                existingAwardedCoinsByDate = existingCoins,
                now = baseNow
            )

            assertThat(result.awardedCoins).isEqualTo(0)
            assertThat(result.rejectedDates[today]).isEqualTo(CoinRejectionReason.EXCEEDS_365_DAY_CAP)
        }

        @Test
        @DisplayName("지급 시점이 한참 지난 뒤 한꺼번에 정산되더라도 상한은 '지급일'이 아닌 '수행 날짜 윈도우' 기준으로 검증된다")
        fun verifyWindowCapBasedOnExecutionDateNotPayoutDate() {
            val context = createDefaultContext(
                userCreatedAt = baseNow.minusDays(200),
                participantStartDate = today.minusDays(100)
            )

            // 60일 전의 수행일(day -60)과 10일 전의 수행일(day -10)은 서로 다른 30일 윈도우에 속함
            // 각각 30일 윈도우 상한을 초과하지 않으므로, 한 날짜에 동시에 계산(지급)되더라도 모두 정상 승인된다
            val dateA = today.minusDays(60)
            val dateB = today.minusDays(10)

            val candidates = listOf(
                CandidateVerification(1L, dateA, baseNow.minusDays(60)),
                CandidateVerification(2L, dateB, baseNow.minusDays(10))
            )

            val result = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = candidates,
                now = baseNow // 지급일(현재)은 동일하지만 수행일이 다름
            )

            assertThat(result.eligibleDates).containsExactlyInAnyOrder(dateA, dateB)
            assertThat(result.awardedCoins).isEqualTo(20)
        }
    }

    @Nested
    @DisplayName("병행·분할 챌린지 동시 종료 시뮬레이터 (F05 종합)")
    inner class ConcurrentChallengeSimulatorTests {

        @Test
        @DisplayName("사용자가 동일 기간에 2개의 챌린지를 병행하여 동시 종료되었을 때 겹치는 날짜는 10코인만 발행된다")
        fun concurrentChallengesSharingDates() {
            val context = createDefaultContext(
                participantStartDate = today.minusDays(7)
            )

            // 챌린지 1: 5일간 매일 수행 (day -5 ~ day -1)
            val challenge1Dates = (1..5).map { today.minusDays(it.toLong()) }
            // 챌린지 2: 3일간 매일 수행 (day -3 ~ day -1) -> 3일이 겹침
            val challenge2Dates = (1..3).map { today.minusDays(it.toLong()) }

            // 챌린지 1의 인증 먼저 평가
            val c1Candidates = challenge1Dates.mapIndexed { idx, date ->
                CandidateVerification(idx.toLong() + 1, date, date.atTime(10, 0))
            }
            val result1 = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = c1Candidates,
                now = baseNow
            )

            assertThat(result1.awardedCoins).isEqualTo(50) // 5일 * 10 = 50코인

            // 챌린지 2의 인증 평가 시 챌린지 1에서 지급된 이력을 반영
            val grantedCoinsFromC1 = result1.eligibleDates.associateWith { 10 }
            val c2Candidates = challenge2Dates.mapIndexed { idx, date ->
                CandidateVerification(idx.toLong() + 10, date, date.atTime(11, 0))
            }
            val result2 = CoinEligibilityCalculator.calculate(
                context = context,
                candidates = c2Candidates,
                existingAwardedCoinsByDate = grantedCoinsFromC1,
                now = baseNow
            )

            // 챌린지 2의 3일은 모두 이미 챌린지 1에서 10코인을 받았으므로 0코인 추가 (10코인 캡)
            assertThat(result2.awardedCoins).isEqualTo(0)
            assertThat(result2.cappedDates).containsExactlyInAnyOrderElementsOf(challenge2Dates)
            assertThat(result2.rejectedDates.values).allMatch { it == CoinRejectionReason.ALREADY_GRANTED }
        }
    }
}
