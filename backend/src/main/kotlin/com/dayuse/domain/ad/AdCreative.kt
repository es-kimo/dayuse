package com.dayuse.domain.ad

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table

/**
 * dayuse 자체 안내 광고 소재 엔티티 (v0.11 F07)
 * - 외부 유료 광고주 협찬처럼 오인되지 않도록 고정 표기 문구(`REQUIRED_BADGE_TEXT`)를 유지합니다.
 */
@Entity
@Table(
    name = "ad_creatives",
    indexes = [
        Index(
            name = "idx_ad_creative_campaign_active",
            columnList = "campaignId, active"
        )
    ]
)
class AdCreative(
    id: Long = 0L,

    campaignId: Long = 0L,

    @Column(nullable = false, length = 120)
    var title: String,

    @Column(nullable = false, columnDefinition = "TEXT")
    var description: String,

    @Column(length = 500)
    var imageUrl: String? = null,

    @Column(length = 80)
    var ctaText: String? = null,

    @Column(nullable = false, length = 120)
    var badgeText: String = REQUIRED_BADGE_TEXT,

    @Column(nullable = false)
    var minWatchSeconds: Int = DEFAULT_MIN_WATCH_SECONDS,

    @Column(nullable = false)
    var active: Boolean = true
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var campaignId: Long = campaignId
        protected set

    init {
        validateCreative(title, description, minWatchSeconds, badgeText)
    }

    private fun validateCreative(
        targetTitle: String,
        targetDescription: String,
        targetMinWatchSeconds: Int,
        targetBadgeText: String
    ) {
        if (targetTitle.isBlank()) {
            throw BadRequestException("소재 제목은 비어 있을 수 없습니다.")
        }
        if (targetDescription.isBlank()) {
            throw BadRequestException("소재 설명 문구는 비어 있을 수 없습니다.")
        }
        if (targetMinWatchSeconds <= 0) {
            throw BadRequestException("최소 시청 시간은 1초 이상이어야 합니다.")
        }
        if (targetBadgeText != REQUIRED_BADGE_TEXT) {
            throw BadRequestException("자체 광고 표기 문구는 '$REQUIRED_BADGE_TEXT'이어야 합니다.")
        }
    }

    fun update(
        newTitle: String? = null,
        newDescription: String? = null,
        newImageUrl: String? = null,
        newCtaText: String? = null,
        newMinWatchSeconds: Int? = null,
        newActive: Boolean? = null
    ) {
        val resolvedTitle = newTitle?.trim() ?: this.title
        val resolvedDescription = newDescription?.trim() ?: this.description
        val resolvedWatchSeconds = newMinWatchSeconds ?: this.minWatchSeconds
        validateCreative(resolvedTitle, resolvedDescription, resolvedWatchSeconds, this.badgeText)

        this.title = resolvedTitle
        this.description = resolvedDescription
        if (newImageUrl != null) {
            this.imageUrl = newImageUrl.trim().ifBlank { null }
        }
        if (newCtaText != null) {
            this.ctaText = newCtaText.trim().ifBlank { null }
        }
        this.minWatchSeconds = resolvedWatchSeconds
        if (newActive != null) {
            this.active = newActive
        }
    }

    companion object {
        const val REQUIRED_BADGE_TEXT = "dayuse 자체 안내 · 시청 완료 시 리데이 티켓 1장"
        const val DEFAULT_MIN_WATCH_SECONDS = 10
    }
}
