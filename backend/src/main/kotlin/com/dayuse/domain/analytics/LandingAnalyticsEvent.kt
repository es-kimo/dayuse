package com.dayuse.domain.analytics

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EntityListeners
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

@Entity
@Table(
    name = "landing_analytics_events",
    indexes = [
        Index(name = "idx_landing_analytics_session", columnList = "sessionId"),
        Index(name = "idx_landing_analytics_event", columnList = "eventName"),
        Index(name = "idx_landing_analytics_created", columnList = "createdAt")
    ]
)
@EntityListeners(AuditingEntityListener::class)
class LandingAnalyticsEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(nullable = false, length = 64)
    val sessionId: String,

    @Column(nullable = false, length = 32)
    val eventName: String,

    @Column(length = 32)
    val placement: String? = null,

    @Column(nullable = false, length = 64)
    val utmSource: String = "direct",

    @Column(nullable = false, length = 64)
    val utmMedium: String = "unknown",

    @Column(nullable = false, length = 64)
    val utmCampaign: String = "unknown",

    @Column(nullable = false, length = 64)
    val utmContent: String = "unknown",

    @Column(length = 255)
    val referrer: String? = null,

    @CreatedDate
    @Column(nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
)
