package com.dayuse.domain.feature

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

@Entity
@Table(
    name = "feature_events",
    indexes = [
        Index(name = "idx_feature_events_user", columnList = "user_id"),
        Index(name = "idx_feature_events_key_type", columnList = "feature_key, event_type"),
        Index(name = "idx_feature_events_created", columnList = "created_at")
    ]
)
@EntityListeners(AuditingEntityListener::class)
class FeatureEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "user_id", nullable = true)
    val userId: Long? = null,

    @Column(name = "feature_key", nullable = false, length = 64)
    val featureKey: String,

    @Column(nullable = false, length = 16)
    val variant: String,

    @Column(name = "event_type", nullable = false, length = 32)
    val eventType: String,

    @Column(columnDefinition = "TEXT")
    val metadata: String? = null,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now()
)
