package com.dayuse.domain.analytics.dto

import com.dayuse.domain.analytics.FunnelStepResult
import com.dayuse.domain.analytics.ProductEventPeriod
import java.time.LocalDate

data class AnalyticsPeriodResponse(
    val startDate: LocalDate,
    val endDate: LocalDate,
    val days: Long
) {
    companion object {
        fun from(period: ProductEventPeriod): AnalyticsPeriodResponse {
            return AnalyticsPeriodResponse(
                startDate = period.startDate,
                endDate = period.endDate,
                days = period.days
            )
        }
    }
}

/** eventName별 발생 수와 고유 사용자 수. */
data class EventNameBreakdownResponse(
    val eventName: String,
    val events: Long,
    val users: Long
)

/** 일자별 발생 추이 한 점. 이벤트가 없는 날도 0으로 채워 내려준다. */
data class DailyTrendPointResponse(
    val date: LocalDate,
    val events: Long,
    val users: Long
)

data class ProductEventSummaryResponse(
    val period: AnalyticsPeriodResponse,
    /** 필터로 지정한 eventName. 지정하지 않았으면 null(전체). */
    val eventName: String?,
    val totalEvents: Long,
    val uniqueUsers: Long,
    val byEventName: List<EventNameBreakdownResponse>,
    val dailyTrend: List<DailyTrendPointResponse>
)

data class FunnelStepResponse(
    val step: Int,
    val eventName: String,
    val reachedUsers: Long,
    val stepConversionRate: Double,
    val overallConversionRate: Double
) {
    companion object {
        fun from(result: FunnelStepResult): FunnelStepResponse {
            return FunnelStepResponse(
                step = result.step,
                eventName = result.eventName,
                reachedUsers = result.reachedUsers,
                stepConversionRate = result.stepConversionRate,
                overallConversionRate = result.overallConversionRate
            )
        }
    }
}

data class ProductEventFunnelResponse(
    val period: AnalyticsPeriodResponse,
    /** 프리셋으로 조회했으면 그 키, 단계를 직접 지정했으면 null. */
    val funnel: String?,
    val steps: List<FunnelStepResponse>,
    /** 첫 단계 대비 마지막 단계 전환율(%). */
    val overallConversionRate: Double
)
