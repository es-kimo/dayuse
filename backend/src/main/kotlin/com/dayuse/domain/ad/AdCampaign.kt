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
import java.time.LocalDateTime

/**
 * 자체 광고 캠페인 상태 (v0.11 F07)
 */
enum class AdCampaignStatus {
    DRAFT,
    ACTIVE,
    PAUSED
}

/**
 * 광고 노출 슬롯 식별자 (v0.11 F07)
 * - v0.11에서는 리데이 티켓 획득용 슬롯 1개만 허용합니다.
 */
enum class AdSlotType {
    REDAY_TICKET_REWARD
}

/**
 * dayuse 자체 안내 광고 캠페인 엔티티 (v0.11 F07)
 */
@Entity
@Table(
    name = "ad_campaigns",
    indexes = [
        Index(
            name = "idx_ad_campaign_slot_status",
            columnList = "slotType, status, priority"
        )
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_ad_campaign_key",
            columnNames = ["campaignKey"]
        )
    ]
)
class AdCampaign(
    id: Long = 0L,

    @Column(nullable = false, length = 100)
    var campaignKey: String,

    @Column(nullable = false, length = 100)
    var title: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var slotType: AdSlotType = AdSlotType.REDAY_TICKET_REWARD,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: AdCampaignStatus = AdCampaignStatus.DRAFT,

    @Column(nullable = false)
    var priority: Int = 0,

    @Column(nullable = false)
    var dailyImpressionLimit: Int = DEFAULT_DAILY_IMPRESSION_LIMIT,

    @Column(nullable = false)
    var startAt: LocalDateTime,

    @Column(nullable = false)
    var endAt: LocalDateTime
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    init {
        validatePolicy(dailyImpressionLimit, startAt, endAt)
    }

    private fun validatePolicy(
        targetDailyLimit: Int,
        targetStartAt: LocalDateTime,
        targetEndAt: LocalDateTime
    ) {
        if (targetDailyLimit <= 0) {
            throw BadRequestException("일일 노출 상한은 1회 이상이어야 합니다.")
        }
        if (!targetEndAt.isAfter(targetStartAt)) {
            throw BadRequestException("캠페인 종료 일시는 시작 일시 이후여야 합니다.")
        }
    }

    /**
     * 주어진 시각(now)과 요청 슬롯(requestedSlot)에 대해 이 캠페인이 노출 후보가 될 수 있는지 판별합니다.
     * - 상태가 ACTIVE여야 함
     * - 슬롯이 일치해야 함
     * - 운영 기간(startAt <= now <= endAt) 내여야 함
     */
    fun isServableAt(
        now: LocalDateTime,
        requestedSlot: AdSlotType = AdSlotType.REDAY_TICKET_REWARD
    ): Boolean {
        return status == AdCampaignStatus.ACTIVE &&
            slotType == requestedSlot &&
            !now.isBefore(startAt) &&
            !now.isAfter(endAt)
    }

    fun update(
        newTitle: String? = null,
        newStatus: AdCampaignStatus? = null,
        newPriority: Int? = null,
        newDailyImpressionLimit: Int? = null,
        newStartAt: LocalDateTime? = null,
        newEndAt: LocalDateTime? = null
    ) {
        val resolvedLimit = newDailyImpressionLimit ?: this.dailyImpressionLimit
        val resolvedStart = newStartAt ?: this.startAt
        val resolvedEnd = newEndAt ?: this.endAt
        validatePolicy(resolvedLimit, resolvedStart, resolvedEnd)

        if (!newTitle.isNullOrBlank()) {
            this.title = newTitle.trim()
        }
        if (newStatus != null) {
            this.status = newStatus
        }
        if (newPriority != null) {
            this.priority = newPriority
        }
        this.dailyImpressionLimit = resolvedLimit
        this.startAt = resolvedStart
        this.endAt = resolvedEnd
    }

    companion object {
        const val DEFAULT_DAILY_IMPRESSION_LIMIT = 3
    }
}
