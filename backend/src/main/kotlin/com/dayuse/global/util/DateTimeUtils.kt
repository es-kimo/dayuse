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
     * 대상일(targetDate)의 리데이 기한(targetDate + 2일 09:00:00 KST)을 반환합니다. (v0.11 F02)
     */
    fun calculateRedayDeadline(targetDate: LocalDate): LocalDateTime {
        return targetDate.plusDays(2).atTime(9, 0)
    }

    /**
     * KST 서버 시각 기준 인증 시간 구간 판정 (v0.11 F02)
     * - targetDate 00:00 <= t < targetDate + 1일 00:00: NORMAL (정상 인증)
     * - targetDate + 1일 00:00 <= t < targetDate + 1일 09:00: LATE (늦은 인증, 벌금 없음)
     * - targetDate + 1일 09:00 <= t < targetDate + 2일 09:00: OVERDUE_REDAY_ELIGIBLE (지각 인증 · 리데이 가능 구간)
     * - targetDate + 2일 09:00 <= t: OVERDUE_EXPIRED (지각 인증 · 리데이 기한 만료)
     */
    fun evaluateVerificationPhase(
        targetDate: LocalDate,
        submittedAt: LocalDateTime = nowKst()
    ): com.dayuse.domain.dailyrecord.VerificationTimePhase {
        val nextDayMidnight = targetDate.plusDays(1).atStartOfDay()
        val lateGraceDeadline = targetDate.plusDays(1).atTime(9, 0)
        val redayDeadline = calculateRedayDeadline(targetDate)

        return when {
            submittedAt < nextDayMidnight -> com.dayuse.domain.dailyrecord.VerificationTimePhase.NORMAL
            submittedAt < lateGraceDeadline -> com.dayuse.domain.dailyrecord.VerificationTimePhase.LATE
            submittedAt < redayDeadline -> com.dayuse.domain.dailyrecord.VerificationTimePhase.OVERDUE_REDAY_ELIGIBLE
            else -> com.dayuse.domain.dailyrecord.VerificationTimePhase.OVERDUE_EXPIRED
        }
    }

    /**
     * 현재 시각(now)이 대상일(targetDate)의 리데이 기한(targetDate + 2일 09:00 미만) 이내인지 반환합니다.
     */
    fun isWithinRedayWindow(targetDate: LocalDate, now: LocalDateTime = nowKst()): Boolean {
        return now < calculateRedayDeadline(targetDate)
    }

    /**
     * 현재 시각(now)이 대상일(targetDate)의 리데이 기한(targetDate + 2일 09:00 이상)을 경과했는지 반환합니다.
     */
    fun isRedayDeadlineExpired(targetDate: LocalDate, now: LocalDateTime = nowKst()): Boolean {
        return !isWithinRedayWindow(targetDate, now)
    }

    /**
     * 현재 시각이 심야/새벽 유예 기간(00:00 ~ 09:00 KST)에 해당하는지 여부를 반환합니다.
     */
    fun isNightGraceWindow(now: LocalDateTime = nowKst()): Boolean {
        return now.hour in 0..8
    }
}
