package com.dayuse.global.util

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId

object DateTimeUtils {
    val KST_ZONE: ZoneId = ZoneId.of("Asia/Seoul")

    fun todayKst(): LocalDate = LocalDate.now(KST_ZONE)

    fun nowKst(): LocalDateTime = LocalDateTime.now(KST_ZONE)

    /**
     * 대상 날짜(targetDate) 대비 지각 여부 판별.
     * 대상 날짜 익일 오전 09:00 KST 이전 등록 건은 정상(false),
     * 익일 오전 09:00 KST 이후 또는 그 이후 날짜 등록 건은 지각(true).
     */
    fun isLateVerification(targetDate: LocalDate, submittedAt: LocalDateTime = nowKst()): Boolean {
        val deadline = targetDate.plusDays(1).atTime(9, 0)
        return submittedAt.isAfter(deadline)
    }

    /**
     * 현재 시각이 심야/새벽 유예 기간(00:00 ~ 09:00 KST)에 해당하는지 여부를 반환합니다.
     */
    fun isNightGraceWindow(now: LocalDateTime = nowKst()): Boolean {
        return now.hour in 0..8
    }
}
