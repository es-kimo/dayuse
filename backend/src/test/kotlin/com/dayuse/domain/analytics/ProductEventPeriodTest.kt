@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate

class ProductEventPeriodTest {

    private val today = LocalDate.of(2026, 9, 30)

    @Test
    @DisplayName("기간을 생략하면 오늘 포함 최근 7일로 닫힌다")
    fun defaultsToLastSevenDays() {
        val period = ProductEventPeriod.of(null, null, today)

        assertEquals(LocalDate.of(2026, 9, 24), period.startDate)
        assertEquals(today, period.endDate)
        assertEquals(7L, period.days)
    }

    @Test
    @DisplayName("종료일의 마지막 순간까지 포함하도록 상한을 다음 날 자정으로 연다")
    fun endExclusiveIsNextMidnight() {
        val period = ProductEventPeriod.of(LocalDate.of(2026, 9, 1), LocalDate.of(2026, 9, 2), today)

        assertEquals(LocalDate.of(2026, 9, 1).atStartOfDay(), period.startInclusive)
        assertEquals(LocalDate.of(2026, 9, 3).atStartOfDay(), period.endExclusive)
        assertEquals(2L, period.days)
    }

    @Test
    @DisplayName("한쪽만 지정하면 나머지를 그 기준으로 채운다")
    fun fillsMissingBoundary() {
        val onlyEnd = ProductEventPeriod.of(null, LocalDate.of(2026, 9, 10), today)
        assertEquals(LocalDate.of(2026, 9, 4), onlyEnd.startDate)

        val onlyStart = ProductEventPeriod.of(LocalDate.of(2026, 9, 1), null, today)
        assertEquals(LocalDate.of(2026, 9, 7), onlyStart.endDate)
    }

    @Test
    @DisplayName("시작일이 종료일보다 뒤이면 거부한다")
    fun rejectsReversedRange() {
        assertThrows<BadRequestException> {
            ProductEventPeriod.of(LocalDate.of(2026, 9, 10), LocalDate.of(2026, 9, 1), today)
        }
    }

    @Test
    @DisplayName("최대 기간을 넘으면 거부해 전체 풀스캔을 막는다")
    fun rejectsTooLongRange() {
        val start = today.minusDays(ProductEventPeriod.MAX_DAYS)
        assertThrows<BadRequestException> { ProductEventPeriod.of(start, today, today) }

        // 경계값(정확히 MAX_DAYS일)은 허용한다.
        val boundary = ProductEventPeriod.of(today.minusDays(ProductEventPeriod.MAX_DAYS - 1), today, today)
        assertEquals(ProductEventPeriod.MAX_DAYS, boundary.days)
    }
}
