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
}
