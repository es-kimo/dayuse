package com.dayuse.domain.feature

import jakarta.persistence.*
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

@Entity
@Table(
    name = "feature_assignments",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_feature_assignment_user_key",
            columnNames = ["user_id", "feature_key"]
        )
    ],
    indexes = [
        Index(name = "idx_feature_assignment_key", columnList = "feature_key")
    ]
)
@EntityListeners(AuditingEntityListener::class)
class FeatureAssignment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "feature_key", nullable = false, length = 64)
    val featureKey: String,

    @Column(nullable = false, length = 16)
    var variant: String,

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: LocalDateTime = LocalDateTime.now(),

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
)
