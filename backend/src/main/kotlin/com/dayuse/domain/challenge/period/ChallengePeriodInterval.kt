package com.dayuse.domain.challenge.period

import java.time.LocalDate

data class ChallengePeriodInterval(
    val index: Int,                // 1부터 시작하는 구간 번호
    val startDate: LocalDate,      // 구간 시작일
    val endDate: LocalDate,        // 구간 종료일
    val targetCount: Int,          // 구간 목표 횟수
    val completedCount: Int = 0    // 구간 내 실제 유효 인증 횟수 (1일 1회 한정)
) {
    val isAchieved: Boolean get() = completedCount >= targetCount
    val remainingTarget: Int
        get() = maxOf(
            0,
            targetCount - completedCount
        )
    val effectiveCompletedCount: Int
        get() = minOf(
            targetCount,
            completedCount
        )
}
