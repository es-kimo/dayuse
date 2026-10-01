package com.dayuse.global.util

import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.LocalDateTime

class DateTimeUtilsTest {

    @Test
    fun `대상 날짜 익일 오전 9시 이전 등록은 지각이 아니다`() {
        val targetDate = LocalDate.of(2026, 9, 21)

        // 익일 새벽 2시 등록 (밤샘 수행 패턴)
        val earlyMorning = LocalDateTime.of(2026, 9, 22, 2, 0, 0)
        assertFalse(DateTimeUtils.isLateVerification(targetDate, earlyMorning))

        // 익일 아침 8시 59분 등록
        val beforeNine = LocalDateTime.of(2026, 9, 22, 8, 59, 59)
        assertFalse(DateTimeUtils.isLateVerification(targetDate, beforeNine))

        // 익일 아침 9시 정각 등록
        val exactlyNine = LocalDateTime.of(2026, 9, 22, 9, 0, 0)
        assertFalse(DateTimeUtils.isLateVerification(targetDate, exactlyNine))
    }

    @Test
    fun `대상 날짜 익일 오전 9시 이후 또는 2일 이상 경과 등록은 지각이다`() {
        val targetDate = LocalDate.of(2026, 9, 21)

        // 익일 오전 9시 0분 1초 등록
        val afterNine = LocalDateTime.of(2026, 9, 22, 9, 0, 1)
        assertTrue(DateTimeUtils.isLateVerification(targetDate, afterNine))

        // 익일 오전 10시 등록
        val lateMorning = LocalDateTime.of(2026, 9, 22, 10, 0, 0)
        assertTrue(DateTimeUtils.isLateVerification(targetDate, lateMorning))

        // 2일 뒤 등록
        val twoDaysLater = LocalDateTime.of(2026, 9, 23, 14, 0, 0)
        assertTrue(DateTimeUtils.isLateVerification(targetDate, twoDaysLater))
    }

    @Test
    fun `심야 유예 시간 판별 테스트 (00시~09시 이전 참, 09시 이후 거짓)`() {
        // 자정 00:00:00 -> 참
        assertTrue(DateTimeUtils.isNightGraceWindow(LocalDateTime.of(2026, 9, 22, 0, 0, 0)))

        // 새벽 04:30:00 -> 참
        assertTrue(DateTimeUtils.isNightGraceWindow(LocalDateTime.of(2026, 9, 22, 4, 30, 0)))

        // 아침 08:59:59 -> 참
        assertTrue(DateTimeUtils.isNightGraceWindow(LocalDateTime.of(2026, 9, 22, 8, 59, 59)))

        // 아침 09:00:00 -> 거짓
        assertFalse(DateTimeUtils.isNightGraceWindow(LocalDateTime.of(2026, 9, 22, 9, 0, 0)))

        // 낮 14:00:00 -> 거짓
        assertFalse(DateTimeUtils.isNightGraceWindow(LocalDateTime.of(2026, 9, 22, 14, 0, 0)))
    }

    @Test
    fun `F02 KST 기준 인증 시각 구간 판별 경계값 테스트`() {
        val targetDate = LocalDate.of(2026, 10, 1)

        // 1. 당일 00:00 ~ 23:59:59 -> NORMAL
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.NORMAL,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 1, 0, 0, 0))
        )
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.NORMAL,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 1, 23, 59, 59))
        )

        // 2. 익일 00:00:00 ~ 08:59:59 -> LATE (벌금 없음)
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.LATE,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 2, 0, 0, 0))
        )
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.LATE,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 2, 8, 59, 59))
        )

        // 3. 익일 09:00:00 ~ 익익일 08:59:59 -> OVERDUE_REDAY_ELIGIBLE (지각 인증 & 리데이 가능 구간)
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.OVERDUE_REDAY_ELIGIBLE,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 2, 9, 0, 0))
        )
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.OVERDUE_REDAY_ELIGIBLE,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 3, 8, 59, 59))
        )

        // 4. 익익일 09:00:00 이상 -> OVERDUE_EXPIRED (리데이 불가, 벌금 확정 구간)
        org.junit.jupiter.api.Assertions.assertEquals(
            com.dayuse.domain.dailyrecord.VerificationTimePhase.OVERDUE_EXPIRED,
            DateTimeUtils.evaluateVerificationPhase(targetDate, LocalDateTime.of(2026, 10, 3, 9, 0, 0))
        )
    }

    @Test
    fun `F02 리데이 마감 시각은 항상 대상일 + 2일 09시로 고정된다`() {
        val targetDate = LocalDate.of(2026, 10, 1)
        val deadline = DateTimeUtils.calculateRedayDeadline(targetDate)

        org.junit.jupiter.api.Assertions.assertEquals(LocalDateTime.of(2026, 10, 3, 9, 0, 0), deadline)
        assertTrue(DateTimeUtils.isWithinRedayWindow(targetDate, LocalDateTime.of(2026, 10, 2, 9, 0, 0)))
        assertTrue(DateTimeUtils.isWithinRedayWindow(targetDate, LocalDateTime.of(2026, 10, 3, 8, 59, 59)))
        assertFalse(DateTimeUtils.isWithinRedayWindow(targetDate, LocalDateTime.of(2026, 10, 3, 9, 0, 0)))
        assertFalse(DateTimeUtils.isRedayDeadlineExpired(targetDate, LocalDateTime.of(2026, 10, 3, 8, 59, 59)))
        assertTrue(DateTimeUtils.isRedayDeadlineExpired(targetDate, LocalDateTime.of(2026, 10, 3, 9, 0, 0)))
    }
}
