package com.dayuse.domain.ad.controller

import com.dayuse.domain.ad.dto.AdAbandonResponse
import com.dayuse.domain.ad.dto.AdCampaignResponse
import com.dayuse.domain.ad.dto.AdCreativeResponse
import com.dayuse.domain.ad.dto.AdImpressionResponse
import com.dayuse.domain.ad.dto.AdSessionIssueResponse
import com.dayuse.domain.ad.dto.CompleteAdSessionRequest
import com.dayuse.domain.ad.dto.CompleteAdSessionResponse
import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.dto.RequestAdSessionRequest
import com.dayuse.domain.ad.dto.UpdateAdCampaignRequest
import com.dayuse.domain.ad.dto.UpdateAdCreativeRequest
import com.dayuse.domain.ad.service.AdService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/ads")
class AdController(
    private val adService: AdService
) {

    // ── F07: 자체 광고 캠페인·소재 관리 API ────────────────────────────

    @GetMapping("/campaigns")
    fun getCampaigns(): ResponseEntity<List<AdCampaignResponse>> {
        return ResponseEntity.ok(adService.getCampaigns())
    }

    @PostMapping("/campaigns")
    fun createCampaign(
        @RequestBody request: CreateAdCampaignRequest
    ): ResponseEntity<AdCampaignResponse> {
        val response = adService.createCampaign(request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PatchMapping("/campaigns/{campaignId}")
    fun updateCampaign(
        @PathVariable campaignId: Long,
        @RequestBody request: UpdateAdCampaignRequest
    ): ResponseEntity<AdCampaignResponse> {
        return ResponseEntity.ok(adService.updateCampaign(campaignId, request))
    }

    @PostMapping("/campaigns/{campaignId}/creatives")
    fun addCreative(
        @PathVariable campaignId: Long,
        @RequestBody input: CreateAdCreativeInput
    ): ResponseEntity<AdCreativeResponse> {
        val response = adService.addCreative(campaignId, input)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PatchMapping("/creatives/{creativeId}")
    fun updateCreative(
        @PathVariable creativeId: Long,
        @RequestBody request: UpdateAdCreativeRequest
    ): ResponseEntity<AdCreativeResponse> {
        return ResponseEntity.ok(adService.updateCreative(creativeId, request))
    }

    // ── F08: 광고 선택 및 세션 발급 API ────────────────────────────────

    @PostMapping("/sessions")
    fun requestAdSession(
        @CurrentUserId userId: Long,
        @RequestBody request: RequestAdSessionRequest
    ): ResponseEntity<AdSessionIssueResponse> {
        val response = adService.requestAdSession(userId, request)
        return ResponseEntity.ok(response)
    }

    // ── F09 & F10: 광고 노출·중단·완료 및 리데이 티켓 보상 지급 API ────

    @PostMapping("/sessions/{sessionToken}/impression")
    fun recordImpression(
        @CurrentUserId userId: Long,
        @PathVariable sessionToken: String
    ): ResponseEntity<AdImpressionResponse> {
        val now = com.dayuse.global.util.DateTimeUtils.nowKst().truncatedTo(java.time.temporal.ChronoUnit.SECONDS)
        val response = adService.recordImpression(userId, sessionToken, now)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/sessions/{sessionToken}/abandon")
    fun abandonSession(
        @CurrentUserId userId: Long,
        @PathVariable sessionToken: String
    ): ResponseEntity<AdAbandonResponse> {
        val response = adService.abandonSession(userId, sessionToken)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/sessions/{sessionToken}/complete")
    fun completeSession(
        @CurrentUserId userId: Long,
        @PathVariable sessionToken: String,
        @RequestBody(required = false) request: CompleteAdSessionRequest?
    ): ResponseEntity<CompleteAdSessionResponse> {
        val response = adService.completeSessionAndGrantReward(
            userId = userId,
            sessionToken = sessionToken,
            request = request ?: CompleteAdSessionRequest()
        )
        return ResponseEntity.ok(response)
    }
}
