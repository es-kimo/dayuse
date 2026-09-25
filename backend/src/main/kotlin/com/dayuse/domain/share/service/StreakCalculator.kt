package com.dayuse.domain.share.service

import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Component
import java.time.LocalDate

data class StreakHistoryItem(
    val date: String,
    val completed: Boolean,
    val inPeriod: Boolean
)

data class StreakResult(
    val streakDays: Int,
    val historyJson: String
)

@Component
class StreakCalculator(
    private val objectMapper: ObjectMapper = ObjectMapper()
) {
    fun calculateStreak(
        records: List<DailyRecord>,
        participantStartDate: LocalDate,
        challengeStartDate: LocalDate,
        challengeEndDate: LocalDate,
        today: LocalDate = DateTimeUtils.todayKst(),
        now: java.time.LocalDateTime = DateTimeUtils.nowKst(),
        historyDays: Int = 7
    ): StreakResult {
        val recordsByDate = records.associateBy { it.date }
        val effectiveStartDate =
            if (participantStartDate > challengeStartDate) participantStartDate else challengeStartDate

        val todayRecord = recordsByDate[today]
        val isTodayCompleted = todayRecord?.status == DailyRecordStatus.COMPLETED

        val yesterday = today.minusDays(1)
        val yesterdayRecord = recordsByDate[yesterday]
        val isYesterdayCompleted = yesterdayRecord?.status == DailyRecordStatus.COMPLETED
        val isYesterdayFailed = yesterdayRecord?.status == DailyRecordStatus.FAILED

        // 익일 오전 09:00 이전 심야 유예 기간 여부 (어제 기록이 아직 실패 확정되지 않은 경우에만 유예 적용)
        val isGracePeriod = DateTimeUtils.isNightGraceWindow(now) && !isYesterdayFailed

        val baseDate = when {
            isTodayCompleted -> today
            isYesterdayCompleted -> yesterday
            isGracePeriod -> today.minusDays(2) // 00:00~09:00 사이 어제 미인증 시, 어제 마감 전이므로 그저께까지의 연속 기록 유지
            else -> yesterday
        }

        var streakDays = 0
        if (baseDate >= effectiveStartDate && recordsByDate[baseDate]?.status == DailyRecordStatus.COMPLETED) {
            var checkDate = baseDate
            while (checkDate >= effectiveStartDate) {
                val record = recordsByDate[checkDate]
                if (record?.status == DailyRecordStatus.COMPLETED) {
                    streakDays++;
                    checkDate = checkDate.minusDays(1)
                } else {
                    break
                }
            }
        }

        // 최근 N일간의 히스토리 (과거 -> 오늘 순서)
        val historyItems = (0 until historyDays).map { offset ->
            val d = today.minusDays((historyDays - 1 - offset).toLong())
            val inPeriod = d >= effectiveStartDate && d <= challengeEndDate
            val record = recordsByDate[d]
            val completed = record?.status == DailyRecordStatus.COMPLETED
            StreakHistoryItem(
                date = d.toString(),
                completed = completed,
                inPeriod = inPeriod
            )
        }

        val historyJson = objectMapper.writeValueAsString(historyItems)
        return StreakResult(
            streakDays = streakDays,
            historyJson = historyJson
        )
    }
}
