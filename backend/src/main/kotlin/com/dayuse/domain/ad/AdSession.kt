package com.dayuse.domain.ad

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
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
import java.time.Duration
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
     * 실제 화면 노출(impression)을 기록합니다. (v0.11 F09)
     * - 최초 1회만 노출 시각(`impressionAt`)을 기록하며, 반복 호출 시 최초 노출 시각을 유지합니다.
     * - 이미 중단(`ABANDONED`)되었거나 유효기간이 만료(`EXPIRED` 또는 `now >= expiresAt`)된 미노출 세션은 차단합니다.
     *
     * @return 최초 노출로 기록되었으면 true, 이미 노출 기록이 있었던 반복 호출이면 false
     */
    fun recordImpression(now: LocalDateTime): Boolean {
        if (status == AdSessionStatus.ABANDONED) {
            throw BadRequestException("시청이 중단된 광고 세션에는 노출을 기록할 수 없습니다.")
        }
        if (impressionAt != null) {
            // 이미 최초 노출이 기록된 경우(IMPRESSED 또는 COMPLETED) 최초 노출 시각을 그대로 유지 (중복 집계 방지)
            return false
        }
        if (status == AdSessionStatus.EXPIRED || !now.isBefore(expiresAt)) {
            this.status = AdSessionStatus.EXPIRED
            throw BadRequestException("유효기간이 만료된 광고 세션입니다.")
        }
        this.impressionAt = now
        if (status == AdSessionStatus.ISSUED) {
            this.status = AdSessionStatus.IMPRESSED
        }
        return true
    }

    /**
     * 광고 시청 중단(`ABANDONED`) 상태를 기록합니다. (v0.11 F09)
     * - 이미 완료(`COMPLETED`)된 세션은 중단할 수 없습니다.
     * - 이미 중단된 세션에 대한 재요청은 멱등하게 처리합니다.
     */
    fun abandon(now: LocalDateTime) {
        if (status == AdSessionStatus.COMPLETED) {
            throw BadRequestException("이미 시청 완료된 광고 세션은 중단할 수 없습니다.")
        }
        if (status == AdSessionStatus.ABANDONED) {
            return
        }
        this.status = AdSessionStatus.ABANDONED
        this.abandonedAt = now
    }

    /**
     * 신규 시청 완료 처리 가능 여부를 검증합니다. (v0.11 F09)
     * 1) 시청 중단(`ABANDONED`) 상태 차단
     * 2) 유효기간(`expiresAt`) 만료 상태 차단
     * 3) 실제 노출 기록(`impressionAt != null` 및 `status == IMPRESSED`) 존재 검증
     * 4) 최초 노출 시각(`impressionAt`)으로부터 서버 경과 시간이 `requiredWatchSeconds` 이상인지 검증
     * 5) 클라이언트가 전달한 시청 진행 시간(`clientWatchedSeconds`)이 있을 경우 `requiredWatchSeconds` 이상인지 검증
     */
    fun validateCompletableAt(now: LocalDateTime, clientWatchedSeconds: Int? = null) {
        if (status == AdSessionStatus.ABANDONED) {
            throw BadRequestException("시청이 중단된 광고 세션은 완료 처리할 수 없습니다.")
        }
        if (status == AdSessionStatus.EXPIRED || !now.isBefore(expiresAt)) {
            this.status = AdSessionStatus.EXPIRED
            throw BadRequestException("유효기간이 만료된 광고 세션입니다.")
        }
        val firstImpressedAt = this.impressionAt
            ?: throw BadRequestException("실제 화면에 노출되지 않은 광고 세션은 완료 처리할 수 없습니다.")
        if (status != AdSessionStatus.IMPRESSED) {
            throw BadRequestException("노출 진행 상태의 광고 세션만 완료 처리할 수 있습니다.")
        }

        val rawElapsedSeconds = Duration.between(firstImpressedAt, now).seconds
        // MySQL DATETIME(초 단위 반올림) 및 네트워크 타이밍으로 인한 최대 1초 경계 오차 보정:
        // 클라이언트가 정상적으로 최소 시청 시간을 채워 요청했고 서버 경과 시간이 (requiredWatchSeconds - 1)초 이상이면 인정
        val serverElapsedSeconds = if (
            clientWatchedSeconds != null &&
            clientWatchedSeconds >= requiredWatchSeconds &&
            rawElapsedSeconds >= (requiredWatchSeconds - 1).toLong()
        ) {
            maxOf(rawElapsedSeconds, requiredWatchSeconds.toLong())
        } else {
            rawElapsedSeconds
        }
        if (serverElapsedSeconds < requiredWatchSeconds) {
            throw BadRequestException(
                "최소 시청 시간(${requiredWatchSeconds}초)을 충족하지 못했습니다. (서버 경과 시간: ${serverElapsedSeconds}초)"
            )
        }
        if (clientWatchedSeconds != null && clientWatchedSeconds < requiredWatchSeconds) {
            throw BadRequestException(
                "최소 시청 시간(${requiredWatchSeconds}초)을 충족하지 못했습니다. (시청 진행 시간: ${clientWatchedSeconds}초)"
            )
        }
    }

    /**
     * 광고 세션을 시청 완료 상태로 전환하고 지급된 리데이 티켓 ID를 기록합니다. (v0.11 F10)
     */
    fun complete(now: LocalDateTime, ticketId: Long) {
        this.status = AdSessionStatus.COMPLETED
        this.completedAt = now
        this.grantedTicketId = ticketId
    }

    companion object {
        const val DEFAULT_SESSION_TTL_MINUTES = 10L
    }
}
