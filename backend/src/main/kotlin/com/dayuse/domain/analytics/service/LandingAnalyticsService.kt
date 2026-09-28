package com.dayuse.domain.analytics.service

import com.dayuse.domain.analytics.LandingAnalyticsEvent
import com.dayuse.domain.analytics.LandingAnalyticsEventRepository
import com.dayuse.domain.analytics.dto.LandingConversionSummaryResponse
import com.dayuse.domain.analytics.dto.LandingEventCreateRequest
import com.dayuse.domain.analytics.dto.LandingSourceSummary
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class LandingAnalyticsService(
    private val landingAnalyticsEventRepository: LandingAnalyticsEventRepository
) {

    @Transactional
    fun recordEvent(request: LandingEventCreateRequest): Long {
        val event = LandingAnalyticsEvent(
            sessionId = request.sessionId.trim(),
            eventName = request.eventName.trim(),
            placement = request.placement?.trim(),
            utmSource = request.utmSource?.trim()?.ifEmpty { "direct" } ?: "direct",
            utmMedium = request.utmMedium?.trim()?.ifEmpty { "unknown" } ?: "unknown",
            utmCampaign = request.utmCampaign?.trim()?.ifEmpty { "unknown" } ?: "unknown",
            utmContent = request.utmContent?.trim()?.ifEmpty { "unknown" } ?: "unknown",
            referrer = request.referrer?.trim()
        )
        return landingAnalyticsEventRepository.save(event).id
    }

    fun getConversionSummary(): LandingConversionSummaryResponse {
        val landingSessions = landingAnalyticsEventRepository.countDistinctLandingSessions()
        val startClickSessions = landingAnalyticsEventRepository.countDistinctStartClickSessions()
        val heroClicks = landingAnalyticsEventRepository.countDistinctHeroCtaClickSessions()
        val footerClicks = landingAnalyticsEventRepository.countDistinctFooterCtaClickSessions()
        val myGroupClicks = landingAnalyticsEventRepository.countDistinctMyGroupClickSessions()

        // 시작 클릭률 = 한 번 이상 시작 버튼을 누른 방문 세션 ÷ 랜딩 방문 세션
        val conversionRate = if (landingSessions > 0) {
            startClickSessions.toDouble() / landingSessions.toDouble()
        } else {
            0.0
        }

        val rawSources = landingAnalyticsEventRepository.countLandingSessionsBySource()
        val sources = rawSources.map { row ->
            LandingSourceSummary(
                utmSource = row[0] as String,
                landingSessions = (row[1] as Number).toLong()
            )
        }

        return LandingConversionSummaryResponse(
            totalLandingSessions = landingSessions,
            totalStartClickSessions = startClickSessions,
            heroCtaClickSessions = heroClicks,
            footerCtaClickSessions = footerClicks,
            myGroupClickSessions = myGroupClicks,
            startClickRate = conversionRate,
            sources = sources
        )
    }
}
