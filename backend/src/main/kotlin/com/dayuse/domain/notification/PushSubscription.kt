package com.dayuse.domain.notification

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "push_subscriptions",
    indexes = [
        Index(name = "idx_push_subscriptions_user_id", columnList = "userId")
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_push_subscriptions_endpoint", columnNames = ["endpoint"])
    ]
)
class PushSubscription(
    id: Long = 0L,

    @Column(nullable = false)
    var userId: Long,

    @Column(nullable = false, length = 500, unique = true)
    var endpoint: String,

    @Column(nullable = false, length = 255)
    var p256dh: String,

    @Column(nullable = false, length = 255)
    var auth: String,

    @Column(nullable = false)
    var isActive: Boolean = true
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    fun deactivate() {
        this.isActive = false
    }

    fun activate(p256dh: String, auth: String) {
        this.p256dh = p256dh
        this.auth = auth
        this.isActive = true
    }
}
