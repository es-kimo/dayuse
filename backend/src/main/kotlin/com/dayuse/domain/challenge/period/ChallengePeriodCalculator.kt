package com.dayuse.domain.challenge.period

import com.dayuse.domain.challenge.PeriodType
import java.time.LocalDate
import java.time.temporal.ChronoUnit

data class ChallengePeriodCalculationResult(
    val intervals: List<ChallengePeriodInterval>,
    val totalTargetCount: Int,
    val totalCompletedCount: Int,
    val progressRate: Int,
    val currentPeriod: ChallengePeriodInterval?
)

object ChallengePeriodCalculator {

    /**
     * 참여자 시작일과 챌린지 기간, 수행 주기에 맞추어 7일 단위 구간을 나누고
     * 마지막 구간의 조정 목표치 및 초과 이월 방지 완료율을 계산합니다.
     */
    fun calculate(
        challengeStartDate: LocalDate,
        challengeEndDate: LocalDate,
        participantStartDate: LocalDate,
        periodType: PeriodType,
        targetFrequency: Int?,
        completedDates: Set<LocalDate>,
        today: LocalDate
    ): ChallengePeriodCalculationResult {
        val effectiveStart = if (participantStartDate > challengeStartDate) participantStartDate else challengeStartDate
        val effectiveEnd = challengeEndDate

        if (effectiveStart > effectiveEnd) {
            return ChallengePeriodCalculationResult(
                intervals = emptyList(),
                totalTargetCount = 0,
                totalCompletedCount = 0,
                progressRate = 0,
                currentPeriod = null
            )
        }

        val intervals = mutableListOf<ChallengePeriodInterval>()
        var curStart = effectiveStart
        var index = 1

        while (!curStart.isAfter(effectiveEnd)) {
            val naturalEnd = curStart.plusDays(6) // 7일 단위 구간
            val curEnd = if (naturalEnd.isAfter(effectiveEnd)) effectiveEnd else naturalEnd
            val daysInInterval = ChronoUnit.DAYS.between(curStart, curEnd).toInt() + 1

            // TODO [사용자 미션 2]: 주기 유형(`DAILY` vs `WEEKLY_N`)에 따른 구간 목표 횟수(`targetCount`) 산출 알고리즘을 구현하세요.
            // 힌트:
            // 1. periodType == PeriodType.DAILY: 구간 일수(daysInInterval)만큼 매일 수행이 목표
            // 2. periodType == PeriodType.WEEKLY_N: 주당 목표치(targetFrequency ?: 1)를 기본으로 하되,
            //    마지막 구간처럼 7일 미만으로 남은 경우 minOf(targetFrequency ?: 1, daysInInterval)로 조정 (비율 계산 안 함)
            val target = 0

            val completedInInterval = completedDates.count { it in curStart..curEnd }

            intervals.add(
                ChallengePeriodInterval(
                    index = index,
                    startDate = curStart,
                    endDate = curEnd,
                    targetCount = target,
                    completedCount = completedInInterval
                )
            )

            curStart = curEnd.plusDays(1)
            index++
        }

        val totalTarget = intervals.sumOf { it.targetCount }

        // TODO [사용자 미션 3]: 초과 달성분의 차기 구간 이월 방지 및 전체 완료율(progressRate, 최대 100%) 산출을 구현하세요.
        // 힌트:
        // 1. totalCompleted: 각 구간의 '목표 이내 유효 완료 횟수(effectiveCompletedCount)'의 합으로 집계하여 차기 구간 이월 방지
        // 2. progressRate: totalTarget > 0일 때 ((totalCompleted.toDouble() / totalTarget) * 100).toInt(), 최대 100%로 제한
        val totalCompleted = 0
        val progressRate = 0

        val currentPeriod = intervals.find { today in it.startDate..it.endDate }
            ?: if (today < effectiveStart) intervals.firstOrNull() else intervals.lastOrNull()

        return ChallengePeriodCalculationResult(
            intervals = intervals,
            totalTargetCount = totalTarget,
            totalCompletedCount = totalCompleted,
            progressRate = progressRate,
            currentPeriod = currentPeriod
        )
    }
}
