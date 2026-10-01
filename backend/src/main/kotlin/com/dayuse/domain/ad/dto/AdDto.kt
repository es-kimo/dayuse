package com.dayuse.domain.ad.dto

import com.dayuse.domain.ad.AdCampaign
import com.dayuse.domain.ad.AdCampaignStatus
import com.dayuse.domain.ad.AdCreative
import com.dayuse.domain.ad.AdSession
import com.dayuse.domain.ad.AdSessionStatus
import com.dayuse.domain.ad.AdSlotType
import com.dayuse.domain.ad.AdUnavailableReason
import java.time.LocalDateTime

// ── F07: 캠페인·소재 등록 및 수정 DTO ───────────────────────────────

data class CreateAdCreativeInput(
    val title: String,
    val description: String,
    val imageUrl: String? = null,
    val ctaText: String? = null,
    val minWatchSeconds: Int = AdCreative.DEFAULT_MIN_WATCH_SECONDS,
    val active: Boolean = true
)

data class CreateAdCampaignRequest(
    val campaignKey: String,
    val title: String,
    val slotType: AdSlotType = AdSlotType.REDAY_TICKET_REWARD,
    val status: AdCampaignStatus = AdCampaignStatus.DRAFT,
    val priority: Int = 0,
    val dailyImpressionLimit: Int = AdCampaign.DEFAULT_DAILY_IMPRESSION_LIMIT,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime,
    val creatives: List<CreateAdCreativeInput> = emptyList()
)

data class UpdateAdCampaignRequest(
    val title: String? = null,
    val status: AdCampaignStatus? = null,
    val priority: Int? = null,
    val dailyImpressionLimit: Int? = null,
    val startAt: LocalDateTime? = null,
    val endAt: LocalDateTime? = null
)

data class UpdateAdCreativeRequest(
    val title: String? = null,
    val description: String? = null,
    val imageUrl: String? = null,
    val ctaText: String? = null,
    val minWatchSeconds: Int? = null,
    val active: Boolean? = null
)

data class AdCreativeResponse(
    val id: Long,
    val campaignId: Long,
    val title: String,
    val description: String,
    val imageUrl: String?,
    val ctaText: String?,
    val badgeText: String,
    val minWatchSeconds: Int,
    val active: Boolean
) {
    companion object {
        fun from(creative: AdCreative): AdCreativeResponse = AdCreativeResponse(
            id = creative.id,
            campaignId = creative.campaignId,
            title = creative.title,
            description = creative.description,
            imageUrl = creative.imageUrl,
            ctaText = creative.ctaText,
            badgeText = creative.badgeText,
            minWatchSeconds = creative.minWatchSeconds,
            active = creative.active
        )
    }
}

data class AdCampaignResponse(
    val id: Long,
    val campaignKey: String,
    val title: String,
    val slotType: AdSlotType,
    val status: AdCampaignStatus,
    val priority: Int,
    val dailyImpressionLimit: Int,
    val startAt: LocalDateTime,
    val endAt: LocalDateTime,
    val creatives: List<AdCreativeResponse>
) {
    companion object {
        fun from(campaign: AdCampaign, creatives: List<AdCreative>): AdCampaignResponse = AdCampaignResponse(
            id = campaign.id,
            campaignKey = campaign.campaignKey,
            title = campaign.title,
            slotType = campaign.slotType,
            status = campaign.status,
            priority = campaign.priority,
            dailyImpressionLimit = campaign.dailyImpressionLimit,
            startAt = campaign.startAt,
            endAt = campaign.endAt,
            creatives = creatives.map(AdCreativeResponse::from)
        )
    }
}

// ── F08: 광고 선택 및 세션 발급 DTO ────────────────────────────────

data class RequestAdSessionRequest(
    val dailyRecordId: Long,
    val slotType: AdSlotType = AdSlotType.REDAY_TICKET_REWARD
)

data class AdSessionDetailResponse(
    val sessionId: Long,
    val sessionToken: String,
    val userId: Long,
    val dailyRecordId: Long,
    val campaignId: Long,
    val creativeId: Long,
    val slotType: AdSlotType,
    val status: AdSessionStatus,
    val requiredWatchSeconds: Int,
    val issuedAt: LocalDateTime,
    val expiresAt: LocalDateTime,
    val creative: AdCreativeResponse
) {
    companion object {
        fun from(session: AdSession, creative: AdCreative): AdSessionDetailResponse = AdSessionDetailResponse(
            sessionId = session.id,
            sessionToken = session.sessionToken,
            userId = session.userId,
            dailyRecordId = session.dailyRecordId,
            campaignId = session.campaignId,
            creativeId = session.creativeId,
            slotType = session.slotType,
            status = session.status,
            requiredWatchSeconds = session.requiredWatchSeconds,
            issuedAt = session.issuedAt,
            expiresAt = session.expiresAt,
            creative = AdCreativeResponse.from(creative)
        )
    }
}

/**
 * 광고 세션 발급 응답 (v0.11 F08)
 * - 조건에 맞는 광고가 있으면 available=true, session 포함
 * - 노출 가능한 광고가 없거나 일일 노출 상한 도달 시 available=false, unavailableReason 포함
 */
data class AdSessionIssueResponse(
    val available: Boolean,
    val unavailableReason: AdUnavailableReason? = null,
    val message: String? = null,
    val session: AdSessionDetailResponse? = null
) {
    companion object {
        fun issued(session: AdSession, creative: AdCreative): AdSessionIssueResponse = AdSessionIssueResponse(
            available = true,
            unavailableReason = null,
            message = null,
            session = AdSessionDetailResponse.from(session, creative)
        )

        fun unavailable(reason: AdUnavailableReason, message: String): AdSessionIssueResponse = AdSessionIssueResponse(
            available = false,
            unavailableReason = reason,
            message = message,
            session = null
        )
    }
}

// ── F09 & F10: 광고 노출·완료·중단 및 보상 지급 DTO ───────────────────

data class AdImpressionResponse(
    val sessionId: Long,
    val sessionToken: String,
    val status: AdSessionStatus,
    val impressionAt: LocalDateTime,
    val firstImpression: Boolean,
    val expiresAt: LocalDateTime,
    val requiredWatchSeconds: Int
)

/**
 * 광고 시청 중단 응답 (v0.11 F09)
 * - `firstAbandon`: 이번 요청에서 실제로 중단 상태로 전환되었으면 true, 이미 중단된 세션의 멱등 재요청이면 false
 */
data class AdAbandonResponse(
    val sessionId: Long,
    val sessionToken: String,
    val status: AdSessionStatus,
    val firstAbandon: Boolean,
    val abandonedAt: LocalDateTime
)

data class CompleteAdSessionRequest(
    val watchedSeconds: Int? = null
)

/**
 * 광고 시청 완료 및 리데이 티켓 보상 지급 응답 (v0.11 F09~F10)
 * - `newlyGranted`: 이번 요청에서 최초로 지급되었으면 true, 이미 지급된 세션의 재시도(멱등 응답)이면 false
 * - `targetRecordRedayEligible` / `targetRecordDeadlineExpired`:
 *   광고 시청 도중 대상 지각 기록의 리데이 기한이 만료되었더라도 리데이 티켓 1장은 정상 지급하여 계정에 남기고,
 *   해당 기록의 기한 만료 여부를 함께 안내합니다. (자동 소비 금지)
 */
data class CompleteAdSessionResponse(
    val sessionId: Long,
    val sessionToken: String,
    val status: AdSessionStatus,
    val newlyGranted: Boolean,
    val rewardHistoryId: Long,
    val grantedTicketId: Long,
    val availableTicketCount: Long,
    val completedAt: LocalDateTime,
    val dailyRecordId: Long,
    val targetRecordRedayEligible: Boolean,
    val targetRecordDeadlineExpired: Boolean,
    val message: String
)

