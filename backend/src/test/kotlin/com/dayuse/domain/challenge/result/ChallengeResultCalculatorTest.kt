package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.verification.Verification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.LocalDateTime

@DisplayName("ChallengeResultCalculator 단위 테스트")
class ChallengeResultCalculatorTest {

    private fun createChallenge(
        id: Long = 1L,
        startDate: LocalDate = LocalDate.of(2026, 10, 1),
        endDate: LocalDate = LocalDate.of(2026, 10, 7),
        periodType: PeriodType = PeriodType.DAILY,
        executionType: ExecutionType = ExecutionType.INDIVIDUAL,
        targetFrequency: Int? = null,
        abortedAt: LocalDateTime? = null
    ): Challenge {
        val challenge = Challenge(
            id = id,
            groupId = 100L,
            creatorUserId = 1L,
            title = "테스트 챌린지",
            verificationCriteria = "인증 기준",
            startDate = startDate,
            endDate = endDate,
            periodType = periodType,
            targetFrequency = targetFrequency,
            executionType = executionType
        )
        if (abortedAt != null) {
            challenge.abort(userId = 1L, reason = "중단 사유", now = abortedAt)
        }
        return challenge
    }

    private fun createParticipant(
        id: Long = 10L,
        userId: Long = 1L,
        startDate: LocalDate = LocalDate.of(2026, 10, 1),
        status: ParticipantStatus = ParticipantStatus.ACTIVE
    ): ChallengeParticipant {
        return ChallengeParticipant(
            id = id,
            challengeId = 1L,
            userId = userId,
            startDate = startDate,
            penaltyAmount = 1000,
            status = status
        )
    }

    private fun createVerification(
        id: Long,
        userId: Long,
        targetDate: LocalDate,
        isLate: Boolean = false,
        createdAt: LocalDateTime = targetDate.atTime(12, 0)
    ): Verification {
        val verification = Verification(
            id = id,
            groupId = 100L,
            challengeId = 1L,
            userId = userId,
            targetDate = targetDate,
            imageUrl = "https://example.com/$id.jpg",
            isLate = isLate
        )
        // Reflection 또는 BaseTimeEntity createdAt 설정 (단위 테스트에서 시간 비교용)
        val field = verification.javaClass.superclass.getDeclaredField("createdAt")
        field.isAccessible = true
        field.set(verification, createdAt)
        return verification
    }

    @Test
    @DisplayName("상태 판정: 운영 종료 익일 00:00~08:59에는 PROVISIONAL, 09:00 이후에는 CONFIRMED, 중단 시 ABORTED")
    fun testStatusEvaluation() {
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 7)
        )

        // 1) 운영 종료 익일 오전 08:30 KST -> PROVISIONAL
        val provisionalTime = LocalDateTime.of(2026, 10, 8, 8, 30)
        val statusProvisional = ChallengeResultCalculator.evaluateResultStatus(challenge, provisionalTime)
        assertThat(statusProvisional).isEqualTo(ChallengeResultStatus.PROVISIONAL)

        // 2) 최종 마감 기한인 익일 오전 09:00 KST -> CONFIRMED
        val confirmedTime = LocalDateTime.of(2026, 10, 8, 9, 0)
        val statusConfirmed = ChallengeResultCalculator.evaluateResultStatus(challenge, confirmedTime)
        assertThat(statusConfirmed).isEqualTo(ChallengeResultStatus.CONFIRMED)

        // 3) 중단된 챌린지 -> ABORTED
        val abortedChallenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 7),
            abortedAt = LocalDateTime.of(2026, 10, 4, 15, 0)
        )
        val statusAborted = ChallengeResultCalculator.evaluateResultStatus(abortedChallenge, provisionalTime)
        assertThat(statusAborted).isEqualTo(ChallengeResultStatus.ABORTED)
    }

    @Test
    @DisplayName("매일 각자하기: 정상 인증 완주 성공 및 달성률 100% 검증")
    fun testDailyIndividualFullSuccess() {
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 3) // 3일
        )
        val participant = createParticipant(userId = 1L, startDate = LocalDate.of(2026, 10, 1))

        val verifications = listOf(
            createVerification(1L, 1L, LocalDate.of(2026, 10, 1)),
            createVerification(2L, 1L, LocalDate.of(2026, 10, 2)),
            createVerification(3L, 1L, LocalDate.of(2026, 10, 3))
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = listOf(participant),
            verifications = verifications,
            now = LocalDateTime.of(2026, 10, 4, 10, 0)
        )

        assertThat(result.status).isEqualTo(ChallengeResultStatus.CONFIRMED)
        assertThat(result.totalTargetCount).isEqualTo(3)
        assertThat(result.totalCompletedCount).isEqualTo(3)
        assertThat(result.achievementRate).isEqualTo(100.0)
        assertThat(result.isSuccess).isTrue()

        val part = result.participants.first()
        assertThat(part.targetCount).isEqualTo(3)
        assertThat(part.completedCount).isEqualTo(3)
        assertThat(part.achievementRate).isEqualTo(100.0)
        assertThat(part.isSuccess).isTrue()
    }

    @Test
    @DisplayName("매일 각자하기: 지각 인증 및 리데이 적용 건은 코인/집계 인정 수행에서 제외")
    fun testDailyIndividualExcludeLateAndReday() {
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 3)
        )
        val participant = createParticipant(userId = 1L, startDate = LocalDate.of(2026, 10, 1))

        val verifications = listOf(
            createVerification(1L, 1L, LocalDate.of(2026, 10, 1), isLate = false),
            createVerification(2L, 1L, LocalDate.of(2026, 10, 2), isLate = true), // 지각 -> 제외
            createVerification(3L, 1L, LocalDate.of(2026, 10, 3), isLate = false)  // 리데이 적용 -> 제외
        )

        val dailyRecordReday = DailyRecord(
            id = 100L,
            groupId = 100L,
            challengeId = 1L,
            challengeParticipantId = participant.id,
            userId = 1L,
            date = LocalDate.of(2026, 10, 3),
            status = DailyRecordStatus.COMPLETED,
            redayApplied = true
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = listOf(participant),
            verifications = verifications,
            dailyRecords = listOf(dailyRecordReday),
            now = LocalDateTime.of(2026, 10, 4, 10, 0)
        )

        assertThat(result.totalTargetCount).isEqualTo(3)
        assertThat(result.totalCompletedCount).isEqualTo(1) // 10월 1일만 인정
        assertThat(result.achievementRate).isEqualTo(33.33)
        assertThat(result.isSuccess).isFalse()

        val part = result.participants.first()
        assertThat(part.completedCount).isEqualTo(1)
        assertThat(part.actualSubmissionCount).isEqualTo(3) // 실제 제출은 3회 모두 카운트
        assertThat(part.isSuccess).isFalse()
    }

    @Test
    @DisplayName("중도 참가자: 개인 참가 시작일 이전 인증 제외 및 목표 횟수 정상 조정")
    fun testMidwayParticipant() {
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 5) // 5일
        )
        // 10월 3일부터 중도 참여
        val participant = createParticipant(userId = 2L, startDate = LocalDate.of(2026, 10, 3))

        val verifications = listOf(
            createVerification(1L, 2L, LocalDate.of(2026, 10, 1)), // 시작일 이전 -> 제외
            createVerification(2L, 2L, LocalDate.of(2026, 10, 3)), // 인정
            createVerification(3L, 2L, LocalDate.of(2026, 10, 4)), // 인정
            createVerification(4L, 2L, LocalDate.of(2026, 10, 5))  // 인정
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = listOf(participant),
            verifications = verifications,
            now = LocalDateTime.of(2026, 10, 6, 10, 0)
        )

        val part = result.participants.first()
        assertThat(part.targetCount).isEqualTo(3) // 10/3 ~ 10/5 총 3일
        assertThat(part.completedCount).isEqualTo(3)
        assertThat(part.achievementRate).isEqualTo(100.0)
        assertThat(part.isSuccess).isTrue()
        assertThat(part.actualSubmissionCount).isEqualTo(3) // 10/1은 참가 기간 외이므로 미반영
    }

    @Test
    @DisplayName("주 N회 각자하기: 주간 초과 수행은 타 주차 미달분과 상계 불가")
    fun testWeeklyNNoCarryOver() {
        // 2주(14일) 챌린지, 주 2회 목표 (총 4회)
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 14),
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 2
        )
        val participant = createParticipant(userId = 1L, startDate = LocalDate.of(2026, 10, 1))

        // 1주차(10/1~10/7)에 4회 초과 수행, 2주차(10/8~10/14)에 0회 수행
        val verifications = listOf(
            createVerification(1L, 1L, LocalDate.of(2026, 10, 1)),
            createVerification(2L, 1L, LocalDate.of(2026, 10, 2)),
            createVerification(3L, 1L, LocalDate.of(2026, 10, 3)),
            createVerification(4L, 1L, LocalDate.of(2026, 10, 4))
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = listOf(participant),
            verifications = verifications,
            now = LocalDateTime.of(2026, 10, 15, 10, 0)
        )

        // 총 목표 4회 중 1주차는 상한 2회만 인정, 2주차 0회 -> 총 인정 2회
        assertThat(result.totalTargetCount).isEqualTo(4)
        assertThat(result.totalCompletedCount).isEqualTo(2)
        assertThat(result.achievementRate).isEqualTo(50.0)
        assertThat(result.isSuccess).isFalse()
    }

    @Test
    @DisplayName("함께하기: 동일 날짜 인증 시 최초 1인만 유효 기여자로 인정 및 공동/개인 기여 분리")
    fun testTogetherChallengeFirstSubmitterCredited() {
        // 3일 매일 함께하기
        val challenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 3),
            executionType = ExecutionType.TOGETHER
        )
        val p1 = createParticipant(id = 10L, userId = 1L, startDate = LocalDate.of(2026, 10, 1))
        val p2 = createParticipant(id = 20L, userId = 2L, startDate = LocalDate.of(2026, 10, 1))

        // 10/1: User 1이 10:00에 먼저 등록, User 2는 11:00에 등록 -> User 1만 기여 인정
        // 10/2: User 2가 09:00에 등록 -> User 2 기여 인정
        // 10/3: User 1이 등록 -> User 1 기여 인정
        val verifications = listOf(
            createVerification(1L, 1L, LocalDate.of(2026, 10, 1), createdAt = LocalDateTime.of(2026, 10, 1, 10, 0)),
            createVerification(2L, 2L, LocalDate.of(2026, 10, 1), createdAt = LocalDateTime.of(2026, 10, 1, 11, 0)),
            createVerification(3L, 2L, LocalDate.of(2026, 10, 2), createdAt = LocalDateTime.of(2026, 10, 2, 9, 0)),
            createVerification(4L, 1L, LocalDate.of(2026, 10, 3), createdAt = LocalDateTime.of(2026, 10, 3, 15, 0))
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = listOf(p1, p2),
            verifications = verifications,
            now = LocalDateTime.of(2026, 10, 4, 10, 0)
        )

        // 공동 목표 3회, 3일 모두 1명 이상 인증 완료 -> 공동 성공
        assertThat(result.totalTargetCount).isEqualTo(3)
        assertThat(result.totalCompletedCount).isEqualTo(3)
        assertThat(result.achievementRate).isEqualTo(100.0)
        assertThat(result.isSuccess).isTrue()

        val part1 = result.participants.find { it.userId == 1L }!!
        val part2 = result.participants.find { it.userId == 2L }!!

        // User 1 기여: 10/1, 10/3 -> 2회
        assertThat(part1.contributionCount).isEqualTo(2)
        assertThat(part1.actualSubmissionCount).isEqualTo(2)
        assertThat(part1.completedCount).isEqualTo(3) // 공동 완료 횟수
        assertThat(part1.isSuccess).isTrue()

        // User 2 기여: 10/2 -> 1회 (10/1은 중복이므로 기여 미인정, 실제 제출 2회)
        assertThat(part2.contributionCount).isEqualTo(1)
        assertThat(part2.actualSubmissionCount).isEqualTo(2)
        assertThat(part2.completedCount).isEqualTo(3)
        assertThat(part2.isSuccess).isTrue()
    }

    @Test
    @DisplayName("엣지 케이스: T=0 나눗셈 방어 및 중단(ABORTED) 시 완주 대상 제외")
    fun testEdgeCasesZeroTargetAndAborted() {
        // 목표가 0인 경우 달성률 null
        val rateZero = ChallengeResultCalculator.calculateAchievementRate(0, 0)
        assertThat(rateZero).isNull()

        // 중단된 챌린지
        val abortedChallenge = createChallenge(
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 7),
            abortedAt = LocalDateTime.of(2026, 10, 2, 12, 0)
        )
        val participant = createParticipant(userId = 1L, startDate = LocalDate.of(2026, 10, 1))
        val verifications = listOf(
            createVerification(1L, 1L, LocalDate.of(2026, 10, 1))
        )

        val result = ChallengeResultCalculator.calculate(
            challenge = abortedChallenge,
            participants = listOf(participant),
            verifications = verifications,
            now = LocalDateTime.of(2026, 10, 8, 10, 0)
        )

        assertThat(result.status).isEqualTo(ChallengeResultStatus.ABORTED)
        assertThat(result.isSuccess).isFalse()
        assertThat(result.participants.first().isSuccess).isFalse()
    }
}
