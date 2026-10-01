package com.dayuse.domain.dailyrecord

/**
 * 인증 시간 구간 분류 (v0.11 F02)
 * 대상일(targetDate) 기준 KST 서버 시각 구간:
 * - NORMAL: targetDate 00:00 <= t < targetDate + 1일 00:00 (정상 인증, 벌금 없음, 리데이 불필요)
 * - LATE: targetDate + 1일 00:00 <= t < targetDate + 1일 09:00 (늦은 인증, 벌금 없음, 리데이 불필요)
 * - OVERDUE_REDAY_ELIGIBLE: targetDate + 1일 09:00 <= t < targetDate + 2일 09:00 (지각 인증 · 리데이 가능 구간)
 * - OVERDUE_EXPIRED: targetDate + 2일 09:00 <= t (지각 인증 · 리데이 기한 만료)
 */
enum class VerificationTimePhase(
    val description: String
) {
    NORMAL("정상 인증"),
    LATE("늦은 인증"),
    OVERDUE_REDAY_ELIGIBLE("지각 인증 (리데이 가능 구간)"),
    OVERDUE_EXPIRED("지각 인증 (기한 만료)");

    val isOverdue: Boolean
        get() = this == OVERDUE_REDAY_ELIGIBLE || this == OVERDUE_EXPIRED

    val isRedayWindowOpen: Boolean
        get() = this == OVERDUE_REDAY_ELIGIBLE
}

/**
 * 리데이 가능 여부 판정 사유 (v0.11 F03)
 */
enum class RedayIneligibleReason(
    val message: String
) {
    ELIGIBLE("리데이 티켓을 사용할 수 있습니다."),
    NOT_OWNER("본인의 인증 기록만 리데이를 적용할 수 있습니다."),
    NOT_ALLOWED("리데이가 허용되지 않은 챌린지입니다."),
    WEEKLY_NOT_SUPPORTED("주 N회 챌린지에는 리데이를 사용할 수 없습니다."),
    TOGETHER_NOT_SUPPORTED("함께하기 챌린지에는 리데이를 사용할 수 없습니다."),
    NO_PENALTY("약정 벌금이 없는 참여 기록에는 리데이가 필요하지 않습니다."),
    CHALLENGE_ABORTED("중단된 챌린지 기록에는 리데이를 사용할 수 없습니다."),
    NOT_VERIFIED("지각 인증을 먼저 등록해야 리데이를 사용할 수 있습니다."),
    NOT_OVERDUE("정상 인증 또는 늦은 인증(익일 09시 전) 기록은 벌금이 없어 리데이 대상이 아닙니다."),
    ALREADY_APPLIED("이미 리데이가 적용되어 벌금이 면제된 기록입니다."),
    ALREADY_SETTLED("이미 입금 신고 중이거나 정산 완료된 기록입니다."),
    ALREADY_CONFIRMED("이미 확정된 벌금이라 리데이를 사용할 수 없습니다."),
    EXPIRED("리데이 가능 기한(대상일 이틀 뒤 오전 9시)이 지났습니다.")
}
