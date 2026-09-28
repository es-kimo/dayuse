package com.dayuse.domain.analytics.controller

import com.dayuse.domain.analytics.dto.LandingConversionSummaryResponse
import com.dayuse.domain.analytics.dto.LandingEventCreateRequest
import com.dayuse.domain.analytics.service.LandingAnalyticsService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/public/analytics")
class LandingAnalyticsController(
    private val landingAnalyticsService: LandingAnalyticsService
) {

    @PostMapping("/events")
    fun recordEvent(
        @Valid @RequestBody request: LandingEventCreateRequest
    ): ResponseEntity<Map<String, Any>> {
        val eventId = landingAnalyticsService.recordEvent(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(
            mapOf(
                "id" to eventId,
                "status" to "recorded"
            )
        )
    }

    @GetMapping("/summary")
    fun getSummary(): ResponseEntity<LandingConversionSummaryResponse> {
        val summary = landingAnalyticsService.getConversionSummary()
        return ResponseEntity.ok(summary)
    }
}
