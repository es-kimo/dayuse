package com.dayuse.domain.challenge.period

import java.time.LocalDate

data class ChallengePeriodInterval(
    val index: Int,                // 1부터 시작하는 구간 번호
    val startDate: LocalDate,      // 구간 시작일
    val endDate: LocalDate,        // 구간 종료일
    val targetCount: Int,          // 구간 목표 횟수
    val completedCount: Int = 0    // 구간 내 실제 유효 인증 횟수 (1일 1회 한정)
) {
    // TODO [사용자 미션 1]: 구간 목표 달성 여부, 잔여 목표 횟수, 초과 달성 이월 방지용 유효 인증 횟수 계산 속성을 구현하세요.
    // 힌트:
    // - isAchieved: 인증 횟수가 목표치 이상인지 여부
    // - remainingTarget: 남은 목표 횟수 (음수가 되지 않도록 최소 0)
    // - effectiveCompletedCount: 다음 구간으로 이월되지 않도록 목표 횟수를 초과한 인증은 목표치까지만 인정 (minOf 활용)
    val isAchieved: Boolean get() = false
    val remainingTarget: Int get() = targetCount
    val effectiveCompletedCount: Int get() = 0
}
