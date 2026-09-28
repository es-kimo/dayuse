package com.dayuse.domain.analytics.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class LandingEventCreateRequest(
    @field:NotBlank
    @field:Size(max = 64)
    val sessionId: String,

    @field:NotBlank
    @field:Size(max = 32)
    val eventName: String,

    @field:Size(max = 32)
    val placement: String? = null,

    @field:Size(max = 64)
    val utmSource: String? = null,

    @field:Size(max = 64)
    val utmMedium: String? = null,

    @field:Size(max = 64)
    val utmCampaign: String? = null,

    @field:Size(max = 64)
    val utmContent: String? = null,

    @field:Size(max = 255)
    val referrer: String? = null
)

data class LandingSourceSummary(
    val utmSource: String,
    val landingSessions: Long
)

data class LandingConversionSummaryResponse(
    val totalLandingSessions: Long,
    val totalStartClickSessions: Long,
    val heroCtaClickSessions: Long,
    val footerCtaClickSessions: Long,
    val myGroupClickSessions: Long,
    val startClickRate: Double,
    val sources: List<LandingSourceSummary>
)
