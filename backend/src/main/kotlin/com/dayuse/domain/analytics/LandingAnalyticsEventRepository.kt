package com.dayuse.domain.analytics

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface LandingAnalyticsEventRepository : JpaRepository<LandingAnalyticsEvent, Long> {

    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName = 'landing_view'")
    fun countDistinctLandingSessions(): Long

    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName IN ('hero_cta_click', 'footer_cta_click')")
    fun countDistinctStartClickSessions(): Long

    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName = 'hero_cta_click'")
    fun countDistinctHeroCtaClickSessions(): Long

    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName = 'footer_cta_click'")
    fun countDistinctFooterCtaClickSessions(): Long

    @Query("SELECT COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName = 'my_group_click'")
    fun countDistinctMyGroupClickSessions(): Long

    @Query("SELECT e.utmSource, COUNT(DISTINCT e.sessionId) FROM LandingAnalyticsEvent e WHERE e.eventName = 'landing_view' GROUP BY e.utmSource")
    fun countLandingSessionsBySource(): List<Array<Any>>
}
