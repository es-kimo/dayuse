package com.dayuse.domain.challenge.period

import com.dayuse.domain.challenge.ExecutionType
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
        today: LocalDate,
        executionType: ExecutionType = ExecutionType.INDIVIDUAL,
        abortedDate: LocalDate? = null
    ): ChallengePeriodCalculationResult {
        val effectiveStart = if (executionType.isTogether) {
            challengeStartDate
        } else {
            if (participantStartDate > challengeStartDate) participantStartDate else challengeStartDate
        }
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
            val daysInInterval = ChronoUnit.DAYS.between(
                curStart,
                curEnd
            ).toInt() + 1

            val target = when (periodType) {
                PeriodType.DAILY -> daysInInterval
                PeriodType.WEEKLY_N -> minOf(
                    targetFrequency ?: 1,
                    daysInInterval
                )
            }

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

        // TODO [사용자 미션 2]: 중단 시점의 열린 수행 기간 정산 제외 및 달성률 분모 재계산 엔진 구현
        // 챌린지가 조기 중단(abortedDate != null)된 경우, 진행 중이던 열린 구간 및 이후 구간은 정산 대상(분모)에서 제외되어야 합니다.
        // - DAILY(매일형): abortedDate 당일 및 이후 날짜는 분모에서 제외. (단, abortedDate <= effectiveStart이면 분모는 0)
        // - WEEKLY_N(주 N회형): interval.endDate < abortedDate 인 이미 마감 완료된 구간들의 targetCount만 합산.
        val totalTarget = intervals.sumOf { it.targetCount }

        val totalCompleted = if (abortedDate != null) {
            when (periodType) {
                PeriodType.DAILY -> {
                    completedDates.count { it in effectiveStart..minOf(effectiveEnd, abortedDate) }
                }
                PeriodType.WEEKLY_N -> {
                    intervals.sumOf { it.effectiveCompletedCount }
                }
            }
        } else {
            intervals.sumOf { it.effectiveCompletedCount }
        }

        val progressRate = if (totalTarget > 0) {
            minOf(
                100,
                ((totalCompleted.toDouble() / totalTarget) * 100).toInt()
            )
        } else {
            0
        }

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
