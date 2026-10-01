package com.dayuse.domain.ad

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

/**
 * 광고 시청 완료 보상 지급 이력 엔티티 (v0.11 F10)
 *
 * - 완료된 광고 세션 1개당 보상 지급 이력 1건과 `RedayTicket` 1장이 원자적으로 생성됩니다.
 * - `sessionId`, `sessionToken`, `ticketId` 각각에 UNIQUE 제약을 두어 중복 완료 요청이나
 *   동시 요청 경합에서도 세션당 보상이 최대 1회만 지급되도록 DB 레벨에서 보장합니다.
 */
@Entity
@Table(
    name = "ad_reward_histories",
    indexes = [
        Index(
            name = "idx_ad_reward_history_user_id",
            columnList = "userId"
        )
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_ad_reward_history_session",
            columnNames = ["sessionId"]
        ),
        UniqueConstraint(
            name = "uk_ad_reward_history_session_token",
            columnNames = ["sessionToken"]
        ),
        UniqueConstraint(
            name = "uk_ad_reward_history_ticket",
            columnNames = ["ticketId"]
        )
    ]
)
class AdRewardHistory(
    id: Long = 0L,

    sessionId: Long = 0L,

    @Column(nullable = false, length = 64)
    val sessionToken: String,

    userId: Long = 0L,

    dailyRecordId: Long = 0L,

    ticketId: Long = 0L,

    @Column(nullable = false)
    val grantedAt: LocalDateTime
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var sessionId: Long = sessionId
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    @Column(nullable = false)
    var dailyRecordId: Long = dailyRecordId
        protected set

    @Column(nullable = false)
    var ticketId: Long = ticketId
        protected set
}
