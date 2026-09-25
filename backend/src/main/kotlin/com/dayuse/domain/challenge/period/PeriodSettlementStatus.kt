package com.dayuse.domain.challenge.period

enum class PeriodSettlementStatus {
    IN_PROGRESS,          // 구간 진행 중 (아직 마감 전)
    ACHIEVED,             // 목표 달성 (벌금 0원)
    NEEDS_CONFIRMATION,   // 구간 종료되었으나 미달성 (사용자 확인 대기)
    CONFIRMED_FAILED      // 사용자가 미수행 확인 완료 (벌금 확정)
}
