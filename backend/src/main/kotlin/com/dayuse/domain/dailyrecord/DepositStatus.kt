package com.dayuse.domain.dailyrecord

enum class DepositStatus(
    val description: String
) {
    UNPAID("미정산"),
    WAITING_CONFIRMATION("입금 확인 대기"),
    CONFIRMED("확인 완료")
}
