package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 집계 조회 기간(KST 기준 일자 구간).
 *
 * 운영 트랜잭션 보호를 위해 기간 없는 전체 풀스캔을 허용하지 않는다.
 * 조회는 항상 [startInclusive, endExclusive) 반개구간으로 환원해
 * occurred_at 인덱스를 그대로 타면서 종료일의 마지막 밀리초도 잃지 않게 한다.
 */
data class ProductEventPeriod(
    val startDate: LocalDate,
    val endDate: LocalDate
) {
    val startInclusive: LocalDateTime = startDate.atStartOfDay()

    /** 종료일 자정 다음 순간. BETWEEN의 상한 경계 손실을 피하려고 '미만' 비교에 쓴다. */
    val endExclusive: LocalDateTime = endDate.plusDays(1).atStartOfDay()

    val days: Long = endDate.toEpochDay() - startDate.toEpochDay() + 1

    companion object {
        /** 기간을 지정하지 않았을 때의 기본 조회 범위(오늘 포함 최근 7일). */
        const val DEFAULT_DAYS = 7L

        /** 한 번에 조회할 수 있는 최대 기간. 운영 DB 보호를 위한 상한. */
        const val MAX_DAYS = 92L

        /**
         * 둘 다 비어 있으면 최근 [DEFAULT_DAYS]일, 한쪽만 있으면 나머지를 그 기준으로 채운다.
         */
        fun of(
            startDate: LocalDate?,
            endDate: LocalDate?,
            today: LocalDate = DateTimeUtils.todayKst()
        ): ProductEventPeriod {
            val resolvedEnd = endDate ?: startDate?.plusDays(DEFAULT_DAYS - 1)?.coerceAtMost(today) ?: today
            val resolvedStart = startDate ?: resolvedEnd.minusDays(DEFAULT_DAYS - 1)

            if (resolvedStart.isAfter(resolvedEnd)) {
                throw BadRequestException("startDate는 endDate보다 뒤일 수 없습니다.")
            }

            val days = resolvedEnd.toEpochDay() - resolvedStart.toEpochDay() + 1
            if (days > MAX_DAYS) {
                throw BadRequestException("조회 기간은 최대 ${MAX_DAYS}일까지만 허용됩니다. (요청: ${days}일)")
            }

            return ProductEventPeriod(
                startDate = resolvedStart,
                endDate = resolvedEnd
            )
        }
    }
}
