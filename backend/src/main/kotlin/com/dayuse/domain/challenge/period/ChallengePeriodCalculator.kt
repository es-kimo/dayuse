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

        val totalTarget = if (abortedDate != null) {
            when (periodType) {
                PeriodType.DAILY -> {
                    if (abortedDate <= effectiveStart) {
                        0
                    } else {
                        val closedEnd = minOf(
                            effectiveEnd,
                            abortedDate.minusDays(1)
                        )
                        (ChronoUnit.DAYS.between(
                            effectiveStart,
                            closedEnd
                        ).toInt() + 1).coerceAtLeast(0)
                    }
                }

                PeriodType.WEEKLY_N -> {
                    intervals.filter { it.endDate < abortedDate }.sumOf { it.targetCount }
                }
            }
        } else {
            intervals.sumOf { it.targetCount }
        }

        val totalCompleted = if (abortedDate != null) {
            when (periodType) {
                PeriodType.DAILY -> {
                    completedDates.count {
                        it in effectiveStart..minOf(
                            effectiveEnd,
                            abortedDate
                        )
                    }
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
