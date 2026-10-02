package com.dayuse.domain.feature.controller

import com.dayuse.domain.feature.dto.FeatureEventRequest
import com.dayuse.domain.feature.service.FeatureEventAsyncService
import com.dayuse.global.security.UserPrincipal
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/features")
class FeatureEventController(
    private val featureEventAsyncService: FeatureEventAsyncService
) {

    /**
     * 프론트엔드 노출(Impression) 및 유저 행동 비동기 로깅
     */
    @PostMapping("/events")
    fun recordEvent(
        @AuthenticationPrincipal principal: Any?,
        @Valid @RequestBody request: FeatureEventRequest
    ): ResponseEntity<Map<String, String>> {
        val userId = if (principal is UserPrincipal) principal.id else null
        featureEventAsyncService.recordEventAsync(
            userId = userId,
            featureKey = request.featureKey,
            variant = request.variant,
            eventType = request.eventType,
            metadata = request.metadata
        )
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(mapOf("status" to "accepted"))
    }
}
