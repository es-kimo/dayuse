package com.dayuse.domain.experiment.controller

import com.dayuse.domain.analytics.service.AnalyticsAccessGuard
import com.dayuse.domain.experiment.ExperimentStatus
import com.dayuse.domain.experiment.dto.ExperimentCreateRequest
import com.dayuse.domain.experiment.dto.ExperimentResolutionResponse
import com.dayuse.domain.experiment.dto.ExperimentResponse
import com.dayuse.domain.experiment.dto.ExperimentRolloutUpdateRequest
import com.dayuse.domain.experiment.dto.ExperimentVariantRatioUpdateRequest
import com.dayuse.domain.experiment.service.ExperimentService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * Experiment 정의·상태 전이 및 Fallback 조회 API. (F01, F08)
 */
@RestController
@RequestMapping("/api/v1/experiments", "/api/experiments")
class ExperimentController(
    private val experimentService: ExperimentService,
    private val analyticsAccessGuard: AnalyticsAccessGuard
) {

    @PostMapping
    fun createExperiment(
        @CurrentUserId userId: Long,
        @RequestBody request: ExperimentCreateRequest
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        val response = experimentService.createExperiment(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping
    fun listExperiments(
        @CurrentUserId userId: Long,
        @RequestParam(required = false) status: ExperimentStatus?
    ): ResponseEntity<List<ExperimentResponse>> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(experimentService.listExperiments(status))
    }

    @GetMapping("/{experimentKey}")
    fun getExperiment(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(experimentService.getExperiment(experimentKey))
    }

    /**
     * 비활성(`DRAFT`/`STOPPED`) 또는 존재하지 않는 `experimentKey` 조회 시에도
     * 예외 없이 기본 경험(Control/A)을 반환하는 Fallback 평가 엔드포인트.
     */
    @GetMapping("/{experimentKey}/fallback", "/{experimentKey}/resolution")
    fun resolveExperimentWithFallback(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String
    ): ResponseEntity<ExperimentResolutionResponse> {
        val resolution = experimentService.resolveWithFallback(experimentKey)
        return ResponseEntity.ok(ExperimentResolutionResponse.from(resolution))
    }

    @PostMapping("/{experimentKey}/activate")
    @PatchMapping("/{experimentKey}/activate")
    fun activateExperiment(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(experimentService.activateExperiment(experimentKey))
    }

    @PostMapping("/{experimentKey}/stop")
    @PatchMapping("/{experimentKey}/stop")
    fun stopExperiment(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(experimentService.stopExperiment(experimentKey))
    }

    @PatchMapping("/{experimentKey}/rollout")
    fun updateRolloutPercentage(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String,
        @RequestBody request: ExperimentRolloutUpdateRequest
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(
            experimentService.updateRolloutPercentage(
                experimentKey = experimentKey,
                rolloutPercentage = request.rolloutPercentage
            )
        )
    }

    @PatchMapping("/{experimentKey}/variant-ratio")
    fun updateVariantRatio(
        @CurrentUserId userId: Long,
        @PathVariable experimentKey: String,
        @RequestBody request: ExperimentVariantRatioUpdateRequest
    ): ResponseEntity<ExperimentResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(
            experimentService.updateVariantRatio(
                experimentKey = experimentKey,
                variantARatio = request.variantARatio,
                variantBRatio = request.variantBRatio
            )
        )
    }
}
