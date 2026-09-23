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
}
