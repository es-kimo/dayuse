package com.dayuse.domain.settlement

enum class DepositReportStatus(
    val description: String
) {
    WAITING_CONFIRMATION("확인 대기"),
    CONFIRMED("확인 완료"),
    REJECTED("반려"),
    CANCELLED("취소")
}
