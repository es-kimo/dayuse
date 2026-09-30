package com.dayuse.domain.analytics.controller

import com.dayuse.domain.analytics.ProductEventPeriod
import com.dayuse.domain.analytics.dto.ProductEventFunnelResponse
import com.dayuse.domain.analytics.dto.ProductEventSummaryResponse
import com.dayuse.domain.analytics.service.AnalyticsAccessGuard
import com.dayuse.domain.analytics.service.ProductEventAnalyticsService
import com.dayuse.global.security.CurrentUserId
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate

/**
 * 운영 확인용 Product Event 집계·퍼널 조회 API. (F06)
 *
 * 응답에는 집계 수치만 담기며 개별 이벤트 레코드나 properties 원문은 내보내지 않는다.
 */
@RestController
@RequestMapping("/api/v1/analytics/product-events", "/api/analytics/product-events")
class ProductEventAnalyticsController(
    private val productEventAnalyticsService: ProductEventAnalyticsService,
    private val analyticsAccessGuard: AnalyticsAccessGuard
) {

    /**
     * 기간별 전체 이벤트 수, 고유 사용자 수, eventName별 요약, 일자별 추이.
     *
     * 기간을 생략하면 오늘 포함 최근 [ProductEventPeriod.DEFAULT_DAYS]일을 조회한다.
     */
    @GetMapping("/summary")
    fun getSummary(
        @CurrentUserId userId: Long,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate?,
        @RequestParam(required = false) eventName: String?
    ): ResponseEntity<ProductEventSummaryResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)

        val summary = productEventAnalyticsService.getSummary(
            period = ProductEventPeriod.of(
                startDate = startDate,
                endDate = endDate
            ),
            eventNameFilter = eventName
        )
        return ResponseEntity.ok(summary)
    }

    /**
     * 지정된 이벤트 순서의 단계별 도달 고유 사용자 수와 전환율.
     *
     * `funnel`로 프리셋(certification, challenge)을 고르거나 `steps`로 순서를 직접 지정한다.
     * 둘 다 없으면 기본 퍼널(인증 시작 → 인증 완료)을 조회한다.
     */
    @GetMapping("/funnel")
    fun getFunnel(
        @CurrentUserId userId: Long,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) startDate: LocalDate?,
        @RequestParam(required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) endDate: LocalDate?,
        @RequestParam(required = false) funnel: String?,
        @RequestParam(required = false) steps: List<String>?
    ): ResponseEntity<ProductEventFunnelResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)

        val response = productEventAnalyticsService.getFunnel(
            period = ProductEventPeriod.of(
                startDate = startDate,
                endDate = endDate
            ),
            presetKey = funnel,
            explicitSteps = steps?.map { it.trim() }?.filter { it.isNotEmpty() }
        )
        return ResponseEntity.ok(response)
    }
}
