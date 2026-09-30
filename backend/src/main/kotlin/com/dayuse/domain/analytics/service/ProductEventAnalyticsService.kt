package com.dayuse.domain.analytics.service

import com.dayuse.domain.analytics.FunnelPreset
import com.dayuse.domain.analytics.ProductEventFunnelCalculator
import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.ProductEventPeriod
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.analytics.dto.AnalyticsPeriodResponse
import com.dayuse.domain.analytics.dto.DailyTrendPointResponse
import com.dayuse.domain.analytics.dto.EventNameBreakdownResponse
import com.dayuse.domain.analytics.dto.FunnelStepResponse
import com.dayuse.domain.analytics.dto.ProductEventFunnelResponse
import com.dayuse.domain.analytics.dto.ProductEventSummaryResponse
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.sql.Date as SqlDate
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 수집된 Product Event의 기본 집계·퍼널 조회. (F06)
 *
 * 모든 조회는 [ProductEventPeriod]로 기간이 닫혀 있어 occurred_at 인덱스를 타며,
 * 기간 없는 전체 풀스캔이 발생하지 않는다.
 */
@Service
@Transactional(readOnly = true)
class ProductEventAnalyticsService(
    private val productEventRepository: ProductEventRepository
) {

    fun getSummary(
        period: ProductEventPeriod,
        eventNameFilter: String?
    ): ProductEventSummaryResponse {
        val normalizedEventName = eventNameFilter
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?.let { ProductEventName.validate(it) }

        val totals = productEventRepository.aggregateTotals(
            startInclusive = period.startInclusive,
            endExclusive = period.endExclusive,
            eventName = normalizedEventName
        ).firstOrNull()

        val byEventName = productEventRepository.aggregateByEventName(
            startInclusive = period.startInclusive,
            endExclusive = period.endExclusive,
            eventName = normalizedEventName
        ).map {
            EventNameBreakdownResponse(
                eventName = it[0] as String,
                events = toLong(it[1]),
                users = toLong(it[2])
            )
        }

        val trendByDate = productEventRepository.aggregateDailyTrend(
            startInclusive = period.startInclusive,
            endExclusive = period.endExclusive,
            eventName = normalizedEventName
        ).associate { toLocalDate(it[0]) to (toLong(it[1]) to toLong(it[2])) }

        return ProductEventSummaryResponse(
            period = AnalyticsPeriodResponse.from(period),
            eventName = normalizedEventName,
            totalEvents = totals?.let { toLong(it[0]) } ?: 0L,
            uniqueUsers = totals?.let { toLong(it[1]) } ?: 0L,
            byEventName = byEventName,
            dailyTrend = fillMissingDays(period, trendByDate)
        )
    }

    fun getFunnel(
        period: ProductEventPeriod,
        presetKey: String?,
        explicitSteps: List<String>?
    ): ProductEventFunnelResponse {
        val preset = if (explicitSteps.isNullOrEmpty()) {
            presetKey?.let { FunnelPreset.from(it) } ?: FunnelPreset.DEFAULT
        } else {
            null
        }
        val steps = ProductEventFunnelCalculator.validateSteps(preset?.steps ?: explicitSteps!!)

        // 사용자·이벤트별 최초 발생 시각만 읽어 단계 순서를 판정한다. 원본 이벤트는 끌어오지 않는다.
        val firstOccurrences = productEventRepository
            .findFirstOccurrencesByUserAndEvent(
                startInclusive = period.startInclusive,
                endExclusive = period.endExclusive,
                eventNames = steps
            )
            .groupBy({ toLong(it[0]) }) { it[1] as String to it[2] as LocalDateTime }
            .mapValues { (_, pairs) -> pairs.toMap() }

        val results = ProductEventFunnelCalculator.calculate(
            steps = steps,
            firstOccurrences = firstOccurrences
        )

        return ProductEventFunnelResponse(
            period = AnalyticsPeriodResponse.from(period),
            funnel = preset?.key,
            steps = results.map { FunnelStepResponse.from(it) },
            overallConversionRate = results.last().overallConversionRate
        )
    }

    /** 발생이 0건인 날도 빠뜨리지 않고 0으로 채워, 추이 그래프에 구멍이 생기지 않게 한다. */
    private fun fillMissingDays(
        period: ProductEventPeriod,
        trendByDate: Map<LocalDate, Pair<Long, Long>>
    ): List<DailyTrendPointResponse> {
        return (0 until period.days).map { offset ->
            val date = period.startDate.plusDays(offset)
            val (events, users) = trendByDate[date] ?: (0L to 0L)
            DailyTrendPointResponse(
                date = date,
                events = events,
                users = users
            )
        }
    }

    private fun toLong(value: Any?): Long = (value as? Number)?.toLong() ?: 0L

    /** CAST(... AS date)의 반환 타입이 JDBC 드라이버에 따라 갈려 양쪽을 모두 받는다. */
    private fun toLocalDate(value: Any?): LocalDate = when (value) {
        is LocalDate -> value
        is SqlDate -> value.toLocalDate()
        is LocalDateTime -> value.toLocalDate()
        else -> LocalDate.parse(value.toString())
    }
}
