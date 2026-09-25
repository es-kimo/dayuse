@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.share

import com.dayuse.domain.share.service.StreakCalculator
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDate

class StreakCalculatorTest {

    private val calculator = StreakCalculator()
    private val today = LocalDate.of(2026, 9, 23)

    @Test
    @DisplayName("오늘 완료한 경우: 오늘을 포함하여 연속 달성 일수를 계산한다")
    fun calculateStreakWhenTodayCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(3), status = DailyRecordStatus.FAILED)
        )

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today
        )

        assertEquals(3, result.streakDays)
        assertTrue(result.historyJson.contains(today.toString()))
    }

    @Test
    @DisplayName("오늘 아직 완료 전인 경우: 어제 기준으로 연속 달성 일수를 계산한다")
    fun calculateStreakWhenTodayNotCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(3), status = DailyRecordStatus.FAILED)
        )

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today
        )

        assertEquals(2, result.streakDays)
    }

    @Test
    @DisplayName("기준일(어제)에 미완료된 경우: streak은 0일이다")
    fun calculateStreakWhenBaseDateNotCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.FAILED),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED)
        )

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today
        )

        assertEquals(0, result.streakDays)
    }

    @Test
    @DisplayName("중도 참여자의 경우: 본인 참여 시작일 이전 날짜는 streak 계산에 포함되지 않는다")
    fun calculateStreakWithMidJoinParticipant() {
        val participantStartDate = today.minusDays(1)
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.COMPLETED),
            // 시작일 이전 레코드
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED)
        )

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = participantStartDate,
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today
        )

        assertEquals(2, result.streakDays)
    }

    @Test
    @DisplayName("자정 후 심야 유예(00:00~09:00 KST) 중 어제 아직 미완료인 경우: 그저께까지의 연속 달성 일수를 보존한다")
    fun calculateStreakDuringGracePeriodWhenYesterdayNotYetCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(3), status = DailyRecordStatus.COMPLETED)
        )

        // 새벽 1시 30분
        val earlyMorning = today.atTime(1, 30)

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today,
            now = earlyMorning
        )

        // 그저께까지 달성한 2일 연속 기록이 0일로 리셋되지 않고 유지됨
        assertEquals(2, result.streakDays)
    }

    @Test
    @DisplayName("오전 9시 이후(유예 만료) 어제 미완료인 경우: streak은 0일로 리셋된다")
    fun calculateStreakAfterGracePeriodWhenYesterdayNotCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(3), status = DailyRecordStatus.COMPLETED)
        )

        // 오전 10시 (09:00 마감 후)
        val afterGrace = today.atTime(10, 0)

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today,
            now = afterGrace
        )

        // 마감 시한이 지났으므로 streak은 0일
        assertEquals(0, result.streakDays)
    }

    @Test
    @DisplayName("심야 유예 시간 중 어제 인증을 완료한 경우: 어제까지의 연속 기록이 정상 계산된다")
    fun calculateStreakDuringGracePeriodWhenYesterdayCompleted() {
        val records = listOf(
            DailyRecord(date = today, status = DailyRecordStatus.WAITING),
            DailyRecord(date = today.minusDays(1), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(2), status = DailyRecordStatus.COMPLETED),
            DailyRecord(date = today.minusDays(3), status = DailyRecordStatus.COMPLETED)
        )

        // 새벽 2시
        val earlyMorning = today.atTime(2, 0)

        val result = calculator.calculateStreak(
            records = records,
            participantStartDate = today.minusDays(10),
            challengeStartDate = today.minusDays(10),
            challengeEndDate = today.plusDays(5),
            today = today,
            now = earlyMorning
        )

        assertEquals(3, result.streakDays)
    }
}
