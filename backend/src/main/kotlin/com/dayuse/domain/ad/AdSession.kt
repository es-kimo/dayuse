package com.dayuse.domain.ad

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime
import java.util.UUID

/**
 * 광고 세션 상태 (v0.11 F08~F10)
 */
enum class AdSessionStatus {
    ISSUED,
    IMPRESSED,
    COMPLETED,
    ABANDONED,
    EXPIRED
}

/**
 * 광고 세션 미발급(광고 없음) 사유 (v0.11 F08)
 */
enum class AdUnavailableReason {
    /** 현재 운영 중인 활성 캠페인/소재가 없음 */
    NO_AVAILABLE_AD,
    /** 활성 캠페인은 있으나 사용자의 당일 실제 노출(impression) 상한에 모두 도달함 */
    DAILY_LIMIT_REACHED
}

/**
 * 광고 시청 세션 엔티티 (v0.11 F08~F10)
 *
 * - 적격 사용자에게만 발급되며 계정당 진행 중인 활성 세션은 하나로 제한됩니다.
 * - 발급 시점의 최소 시청 시간(`requiredWatchSeconds`)과 만료 시각(`expiresAt`, 기본 10분)을 스냅샷으로 보존하여,
 *   이후 캠페인/소재 설정이 변경되더라도 이미 발급된 세션의 보상 조건이 흔들리지 않도록 보장합니다.
 * - 일일 노출 상한은 단순 발급(`ISSUED`)이 아니라 실제 노출(`impressionAt != null`) 기준으로 집계합니다.
 */
@Entity
@Table(
    name = "ad_sessions",
    indexes = [
        Index(
            name = "idx_ad_session_user_status",
            columnList = "userId, status"
        ),
        Index(
            name = "idx_ad_session_campaign_user_impression",
            columnList = "campaignId, userId, impressionAt"
        )
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_ad_session_token",
            columnNames = ["sessionToken"]
        ),
        UniqueConstraint(
            name = "uk_ad_session_granted_ticket",
            columnNames = ["grantedTicketId"]
        )
    ]
)
class AdSession(
    id: Long = 0L,

    @Column(nullable = false, length = 64)
    val sessionToken: String = UUID.randomUUID().toString(),

    userId: Long = 0L,

    dailyRecordId: Long = 0L,

    campaignId: Long = 0L,

    creativeId: Long = 0L,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    val slotType: AdSlotType = AdSlotType.REDAY_TICKET_REWARD,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: AdSessionStatus = AdSessionStatus.ISSUED,

    @Column(nullable = false)
    val requiredWatchSeconds: Int = AdCreative.DEFAULT_MIN_WATCH_SECONDS,

    @Column(nullable = false)
    val issuedAt: LocalDateTime,

    @Column(nullable = false)
    val expiresAt: LocalDateTime = issuedAt.plusMinutes(DEFAULT_SESSION_TTL_MINUTES),

    var impressionAt: LocalDateTime? = null,

    var completedAt: LocalDateTime? = null,

    var abandonedAt: LocalDateTime? = null,

    var grantedTicketId: Long? = null
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    @Column(nullable = false)
    var dailyRecordId: Long = dailyRecordId
        protected set

    @Column(nullable = false)
    var campaignId: Long = campaignId
        protected set

    @Column(nullable = false)
    var creativeId: Long = creativeId
        protected set

    /**
     * 현재 시각(now) 기준 세션 유효기간이 만료되었는지 판별합니다.
     */
    fun isExpiredAt(now: LocalDateTime): Boolean {
        return status == AdSessionStatus.EXPIRED || !now.isBefore(expiresAt)
    }

    /**
     * 현재 시각(now) 기준 계정에서 진행 중인 활성 세션인지 판별합니다.
     * - 상태가 ISSUED 또는 IMPRESSED이고 아직 만료 시각(expiresAt) 이전인 경우에만 진행 중으로 봅니다.
     */
    fun isInProgressAt(now: LocalDateTime): Boolean {
        return (status == AdSessionStatus.ISSUED || status == AdSessionStatus.IMPRESSED) &&
            now.isBefore(expiresAt)
    }

    /**
     * 유효기간이 지난 진행 중 세션을 만료(EXPIRED) 상태로 전환합니다.
     */
    fun expireIfNeeded(now: LocalDateTime): Boolean {
        if ((status == AdSessionStatus.ISSUED || status == AdSessionStatus.IMPRESSED) && !now.isBefore(expiresAt)) {
            this.status = AdSessionStatus.EXPIRED
            return true
        }
        return false
    }

    /**
     * 실제 화면 노출(impression)을 기록합니다. (최초 1회만 시각 기록)
     */
    fun recordImpression(now: LocalDateTime) {
        if (impressionAt == null) {
            this.impressionAt = now
        }
        if (status == AdSessionStatus.ISSUED) {
            this.status = AdSessionStatus.IMPRESSED
        }
    }

    companion object {
        const val DEFAULT_SESSION_TTL_MINUTES = 10L
    }
}
