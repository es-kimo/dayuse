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
        historyDays: Int = 7
    ): StreakResult {
        val recordsByDate = records.associateBy { it.date }
        val effectiveStartDate = if (participantStartDate > challengeStartDate) participantStartDate else challengeStartDate

        // TODO [사용자 미션 2-1]: 오늘 인증 완료 여부(isTodayCompleted)에 따라 기준 날짜(baseDate)를 결정하세요.
        // - "오늘 완료 전에는 어제까지(today.minusDays(1)), 오늘 완료 후에는 오늘까지(today) 집계" 규칙을 적용합니다.
        val baseDate = today // 임시 스텁

        // TODO [사용자 미션 2-2]: 기준일(baseDate)부터 날짜 역순(과거 방향)으로 순회하며 연속 완료 일수(streakDays)를 산출하세요.
        // - 기준일이 effectiveStartDate 이전이거나 미완료(COMPLETED가 아님)인 경우 streakDays는 0입니다.
        // - 연속으로 COMPLETED인 일수를 세되, effectiveStartDate 이전으로 넘어가지 않도록 방어하세요.
        val streakDays = 0 // 임시 스텁

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
