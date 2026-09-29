package com.dayuse.domain.feature.controller

import com.dayuse.domain.feature.dto.FeatureAssignmentResponse
import com.dayuse.domain.feature.dto.FeatureEventRequest
import com.dayuse.domain.feature.service.FeatureEventAsyncService
import com.dayuse.domain.feature.service.FeatureFlagService
import com.dayuse.global.security.UserPrincipal
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/features")
class FeatureFlagController(
    private val featureFlagService: FeatureFlagService,
    private val featureEventAsyncService: FeatureEventAsyncService
) {

    /**
     * 계정별 피처 플래그 배정 조회/할당
     * 인증 유저: 고정 배정(Sticky Rollout) 조회/신규 영속화
     * 비인증 유저: 기본 배정 제공
     * QA/운영자: ui_variant 파라미터로 즉시 강제 오버라이드
     */
    @GetMapping("/assignment")
    fun getAssignment(
        @AuthenticationPrincipal principal: Any?,
        @RequestParam(defaultValue = "ui_refresh_01") featureKey: String,
        @RequestParam(name = "ui_variant", required = false) uiVariant: String?
    ): ResponseEntity<FeatureAssignmentResponse> {
        val userId = if (principal is UserPrincipal) principal.id else null
        val response = featureFlagService.getOrAssignVariant(userId, featureKey, uiVariant)
        return ResponseEntity.ok(response)
    }

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
