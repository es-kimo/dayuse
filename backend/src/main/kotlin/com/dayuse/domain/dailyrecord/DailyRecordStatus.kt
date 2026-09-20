package com.dayuse.domain.dailyrecord

enum class DailyRecordStatus(
    val description: String
) {
    PLANNED("예정"),
    WAITING("인증 대기"),
    COMPLETED("완료"),
    UNCHECKED("미확인"),
    FAILED("미수행")
}
