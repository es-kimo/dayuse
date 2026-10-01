package com.dayuse.domain.dailyrecord

/**
 * 벌금 정책 상태 (v0.11 F04)
 * - NONE: 벌금 없음 (정상 인증, 늦은 인증, 예정/대기 중 등)
 * - PENDING: 리데이 허용 챌린지의 리데이 기한 내(targetDate + 2일 09:00 KST 미만) 벌금 보류 상태 (확정 합계 미산입)
 * - CONFIRMED: 리데이 미허용 미수행/지각 확정, 또는 리데이 기한 만료(targetDate + 2일 09:00 KST 이상)로 벌금이 최종 확정된 상태
 * - EXEMPTED: 리데이 티켓 적용 완료 등으로 벌금이 면제된 상태
 */
enum class PenaltyStatus(
    val description: String
) {
    NONE("없음"),
    PENDING("벌금 보류"),
    CONFIRMED("벌금 확정"),
    EXEMPTED("벌금 면제")
}
