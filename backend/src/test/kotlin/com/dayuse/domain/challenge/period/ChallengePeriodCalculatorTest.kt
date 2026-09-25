package com.dayuse.domain.challenge.period

import com.dayuse.domain.challenge.PeriodType
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDate

class ChallengePeriodCalculatorTest {

    @Test
    @DisplayName("14일 주 3회 챌린지: 7일 2개 구간으로 분할되고 각 구간 목표는 3회이다")
    fun weeklyN_14Days_twoIntervals() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 14) // 14일간

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = startDate,
            challengeEndDate = endDate,
            participantStartDate = startDate,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            completedDates = emptySet(),
            today = startDate
        )

        assertThat(result.intervals).hasSize(2)
        // 구간 1: 10-01 ~ 10-07 (7일, 목표 3)
        assertThat(result.intervals[0].index).isEqualTo(1)
        assertThat(result.intervals[0].startDate).isEqualTo(LocalDate.of(2026, 10, 1))
        assertThat(result.intervals[0].endDate).isEqualTo(LocalDate.of(2026, 10, 7))
        assertThat(result.intervals[0].targetCount).isEqualTo(3)

        // 구간 2: 10-08 ~ 10-14 (7일, 목표 3)
        assertThat(result.intervals[1].index).isEqualTo(2)
        assertThat(result.intervals[1].startDate).isEqualTo(LocalDate.of(2026, 10, 8))
        assertThat(result.intervals[1].endDate).isEqualTo(LocalDate.of(2026, 10, 14))
        assertThat(result.intervals[1].targetCount).isEqualTo(3)

        assertThat(result.totalTargetCount).isEqualTo(6)
        assertThat(result.totalCompletedCount).isEqualTo(0)
        assertThat(result.progressRate).isEqualTo(0)
        assertThat(result.currentPeriod?.index).isEqualTo(1)
    }

    @Test
    @DisplayName("10일 주 3회 챌린지: 마지막 구간(3일간)의 목표는 min(3, 3) = 3회이다")
    fun weeklyN_10Days_shortLastInterval_targetMinNAndDays() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 10) // 10일간

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = startDate,
            challengeEndDate = endDate,
            participantStartDate = startDate,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            completedDates = emptySet(),
            today = startDate
        )

        assertThat(result.intervals).hasSize(2)
        // 1구간 (7일): 10-01 ~ 10-07, 목표 3
        assertThat(result.intervals[0].targetCount).isEqualTo(3)

        // 2구간 (3일): 10-08 ~ 10-10, 목표 min(3, 3) = 3
        assertThat(result.intervals[1].startDate).isEqualTo(LocalDate.of(2026, 10, 8))
        assertThat(result.intervals[1].endDate).isEqualTo(LocalDate.of(2026, 10, 10))
        assertThat(result.intervals[1].targetCount).isEqualTo(3)
        assertThat(result.totalTargetCount).isEqualTo(6)
    }

    @Test
    @DisplayName("8일 주 4회 챌린지: 마지막 구간(1일간)의 목표는 min(4, 1) = 1회이다")
    fun weeklyN_8Days_lastInterval1Day_targetIs1() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 8) // 8일간

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = startDate,
            challengeEndDate = endDate,
            participantStartDate = startDate,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 4,
            completedDates = emptySet(),
            today = startDate
        )

        assertThat(result.intervals).hasSize(2)
        assertThat(result.intervals[0].targetCount).isEqualTo(4)
        assertThat(result.intervals[1].targetCount).isEqualTo(1) // min(4, 1) = 1
        assertThat(result.totalTargetCount).isEqualTo(5)
    }

    @Test
    @DisplayName("1일 챌린지: 1개 구간만 생성되고 목표는 min(N, 1) = 1회이다")
    fun singleDayChallenge() {
        val date = LocalDate.of(2026, 10, 1)

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = date,
            challengeEndDate = date,
            participantStartDate = date,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 5,
            completedDates = setOf(date),
            today = date
        )

        assertThat(result.intervals).hasSize(1)
        assertThat(result.intervals[0].targetCount).isEqualTo(1)
        assertThat(result.intervals[0].completedCount).isEqualTo(1)
        assertThat(result.intervals[0].isAchieved).isTrue()
        assertThat(result.totalTargetCount).isEqualTo(1)
        assertThat(result.totalCompletedCount).isEqualTo(1)
        assertThat(result.progressRate).isEqualTo(100)
    }

    @Test
    @DisplayName("매일형(DAILY) 10일 챌린지: 각 구간 일수만큼 목표가 부여되고 전체 목표는 10회이다")
    fun dailyChallenge_10Days() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 10) // 10일간

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = startDate,
            challengeEndDate = endDate,
            participantStartDate = startDate,
            periodType = PeriodType.DAILY,
            targetFrequency = null,
            completedDates = setOf(
                LocalDate.of(2026, 10, 1),
                LocalDate.of(2026, 10, 2),
                LocalDate.of(2026, 10, 3)
            ),
            today = LocalDate.of(2026, 10, 3)
        )

        assertThat(result.intervals).hasSize(2)
        assertThat(result.intervals[0].targetCount).isEqualTo(7)
        assertThat(result.intervals[1].targetCount).isEqualTo(3)
        assertThat(result.totalTargetCount).isEqualTo(10)
        assertThat(result.totalCompletedCount).isEqualTo(3)
        assertThat(result.progressRate).isEqualTo(30)
    }

    @Test
    @DisplayName("초과 인증 이월 방지: 1구간 목표 3회에 5회 완료 시 3회만 인정되어 다음 구간으로 이월되지 않는다")
    fun overAchievementNotCarriedOver() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 14) // 14일간 (각 구간 3회, 총 6회)

        // 1구간(10-01~10-07)에 5회 완료, 2구간(10-08~10-14)에 0회 완료
        val completedDates = setOf(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 2),
            LocalDate.of(2026, 10, 3),
            LocalDate.of(2026, 10, 4),
            LocalDate.of(2026, 10, 5)
        )

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = startDate,
            challengeEndDate = endDate,
            participantStartDate = startDate,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            completedDates = completedDates,
            today = LocalDate.of(2026, 10, 10)
        )

        assertThat(result.intervals[0].completedCount).isEqualTo(5)
        assertThat(result.intervals[0].effectiveCompletedCount).isEqualTo(3) // 3회만 유효
        assertThat(result.intervals[0].isAchieved).isTrue()

        assertThat(result.intervals[1].completedCount).isEqualTo(0)
        assertThat(result.intervals[1].effectiveCompletedCount).isEqualTo(0)
        assertThat(result.intervals[1].isAchieved).isFalse()

        // 전체 완료 수: 3 + 0 = 3 (5회가 아님!)
        assertThat(result.totalCompletedCount).isEqualTo(3)
        assertThat(result.totalTargetCount).isEqualTo(6)
        // 완료율: 3 / 6 = 50%
        assertThat(result.progressRate).isEqualTo(50)
    }

    @Test
    @DisplayName("중도 참여자: 본인의 수행 시작일부터 7일 단위로 구간이 분할된다")
    fun lateJoinParticipant_intervalsBasedOnParticipantStartDate() {
        val challengeStart = LocalDate.of(2026, 10, 1)
        val challengeEnd = LocalDate.of(2026, 10, 20) // 총 20일
        val participantStart = LocalDate.of(2026, 10, 5) // 5일부터 참여 (총 16일 수행)

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = challengeStart,
            challengeEndDate = challengeEnd,
            participantStartDate = participantStart,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 2,
            completedDates = setOf(LocalDate.of(2026, 10, 5)),
            today = LocalDate.of(2026, 10, 6)
        )

        // 16일 = 7일 + 7일 + 2일 -> 3개 구간
        assertThat(result.intervals).hasSize(3)
        // 1구간: 10-05 ~ 10-11 (7일, 목표 2)
        assertThat(result.intervals[0].startDate).isEqualTo(LocalDate.of(2026, 10, 5))
        assertThat(result.intervals[0].endDate).isEqualTo(LocalDate.of(2026, 10, 11))
        assertThat(result.intervals[0].targetCount).isEqualTo(2)

        // 2구간: 10-12 ~ 10-18 (7일, 목표 2)
        assertThat(result.intervals[1].startDate).isEqualTo(LocalDate.of(2026, 10, 12))
        assertThat(result.intervals[1].endDate).isEqualTo(LocalDate.of(2026, 10, 18))
        assertThat(result.intervals[1].targetCount).isEqualTo(2)

        // 3구간: 10-19 ~ 10-20 (2일, 목표 min(2, 2) = 2)
        assertThat(result.intervals[2].startDate).isEqualTo(LocalDate.of(2026, 10, 19))
        assertThat(result.intervals[2].endDate).isEqualTo(LocalDate.of(2026, 10, 20))
        assertThat(result.intervals[2].targetCount).isEqualTo(2)

        assertThat(result.totalTargetCount).isEqualTo(6)
        assertThat(result.totalCompletedCount).isEqualTo(1)
        assertThat(result.progressRate).isEqualTo(16) // 1/6 = 16%
    }
}
