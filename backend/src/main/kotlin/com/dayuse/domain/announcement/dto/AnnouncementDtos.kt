package com.dayuse.domain.announcement.dto

import com.dayuse.domain.announcement.Announcement
import com.dayuse.domain.announcement.AnnouncementActionTarget
import com.dayuse.domain.announcement.AnnouncementDisplayPhase
import com.dayuse.domain.announcement.AnnouncementFeatureConditionType
import com.dayuse.domain.announcement.AnnouncementPlacement
import com.dayuse.domain.announcement.AnnouncementStatus
import com.dayuse.domain.announcement.AnnouncementUserState
import com.dayuse.global.util.DateTimeUtils
import java.time.LocalDateTime

data class AnnouncementUpsertRequest(
    val title: String,
    val summary: String,
    val body: String,
    val imageUrl: String? = null,
    val imageAlt: String? = null,
    val ctaLabel: String? = null,
    val ctaTarget: AnnouncementActionTarget? = null,
    val placement: AnnouncementPlacement? = null,
    val homeVisible: Boolean = false,
    val featureConditionType: AnnouncementFeatureConditionType = AnnouncementFeatureConditionType.ALL_USERS,
    val featureKey: String? = null,
    val publishAt: LocalDateTime? = null,
    val noticeEndsAt: LocalDateTime? = null
)

data class AnnouncementPublishRequest(
    val publishAt: LocalDateTime? = null,
    val noticeEndsAt: LocalDateTime? = null
)

data class AnnouncementAdminResponse(
    val id: Long,
    val title: String,
    val summary: String,
    val body: String,
    val imageUrl: String?,
    val imageAlt: String?,
    val ctaLabel: String?,
    val ctaTarget: AnnouncementActionTarget?,
    val ctaPath: String?,
    val placement: AnnouncementPlacement?,
    val homeVisible: Boolean,
    val featureConditionType: AnnouncementFeatureConditionType,
    val featureKey: String?,
    val status: AnnouncementStatus,
    val displayPhase: AnnouncementDisplayPhase,
    val publishAt: LocalDateTime?,
    val noticeEndsAt: LocalDateTime?,
    val endedAt: LocalDateTime?,
    val createdBy: Long,
    val updatedBy: Long,
    val publishedBy: Long?,
    val endedBy: Long?,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
) {
    companion object {
        fun from(
            announcement: Announcement,
            now: LocalDateTime = DateTimeUtils.nowKst()
        ): AnnouncementAdminResponse {
            return AnnouncementAdminResponse(
                id = announcement.id,
                title = announcement.title,
                summary = announcement.summary,
                body = announcement.body,
                imageUrl = announcement.imageUrl,
                imageAlt = announcement.imageAlt,
                ctaLabel = announcement.ctaLabel,
                ctaTarget = announcement.ctaTarget,
                ctaPath = announcement.ctaTarget?.internalPath,
                placement = announcement.placement,
                homeVisible = announcement.homeVisible,
                featureConditionType = announcement.featureConditionType,
                featureKey = announcement.featureKey,
                status = announcement.status,
                displayPhase = announcement.resolveDisplayPhase(now),
                publishAt = announcement.publishAt,
                noticeEndsAt = announcement.noticeEndsAt,
                endedAt = announcement.endedAt,
                createdBy = announcement.createdBy,
                updatedBy = announcement.updatedBy,
                publishedBy = announcement.publishedBy,
                endedBy = announcement.endedBy,
                createdAt = announcement.createdAt,
                updatedAt = announcement.updatedAt
            )
        }
    }
}

data class AnnouncementUserItemResponse(
    val id: Long,
    val title: String,
    val summary: String,
    val imageUrl: String?,
    val imageAlt: String?,
    val ctaLabel: String?,
    val ctaTarget: AnnouncementActionTarget?,
    val ctaPath: String?,
    val placement: AnnouncementPlacement?,
    val homeVisible: Boolean,
    val featureKey: String?,
    val displayPhase: AnnouncementDisplayPhase,
    val publishAt: LocalDateTime?,
    val noticeEndsAt: LocalDateTime?,
    val updatedAt: LocalDateTime,
    val isRead: Boolean,
    val readAt: LocalDateTime?,
    val isDismissed: Boolean,
    val dismissedAt: LocalDateTime?
) {
    companion object {
        fun from(
            announcement: Announcement,
            userState: AnnouncementUserState?,
            now: LocalDateTime = DateTimeUtils.nowKst()
        ): AnnouncementUserItemResponse {
            return AnnouncementUserItemResponse(
                id = announcement.id,
                title = announcement.title,
                summary = announcement.summary,
                imageUrl = announcement.imageUrl,
                imageAlt = announcement.imageAlt,
                ctaLabel = announcement.ctaLabel,
                ctaTarget = announcement.ctaTarget,
                ctaPath = announcement.ctaTarget?.internalPath,
                placement = announcement.placement,
                homeVisible = announcement.homeVisible,
                featureKey = announcement.featureKey,
                displayPhase = announcement.resolveDisplayPhase(now),
                publishAt = announcement.publishAt,
                noticeEndsAt = announcement.noticeEndsAt,
                updatedAt = announcement.updatedAt,
                isRead = userState?.isRead ?: false,
                readAt = userState?.readAt,
                isDismissed = userState?.isDismissed ?: false,
                dismissedAt = userState?.dismissedAt
            )
        }
    }
}

data class AnnouncementUserDetailResponse(
    val id: Long,
    val title: String,
    val summary: String,
    val body: String,
    val imageUrl: String?,
    val imageAlt: String?,
    val ctaLabel: String?,
    val ctaTarget: AnnouncementActionTarget?,
    val ctaPath: String?,
    val placement: AnnouncementPlacement?,
    val homeVisible: Boolean,
    val featureKey: String?,
    val displayPhase: AnnouncementDisplayPhase,
    val publishAt: LocalDateTime?,
    val noticeEndsAt: LocalDateTime?,
    val updatedAt: LocalDateTime,
    val isRead: Boolean,
    val readAt: LocalDateTime?,
    val isDismissed: Boolean,
    val dismissedAt: LocalDateTime?
) {
    companion object {
        fun from(
            announcement: Announcement,
            userState: AnnouncementUserState?,
            now: LocalDateTime = DateTimeUtils.nowKst()
        ): AnnouncementUserDetailResponse {
            return AnnouncementUserDetailResponse(
                id = announcement.id,
                title = announcement.title,
                summary = announcement.summary,
                body = announcement.body,
                imageUrl = announcement.imageUrl,
                imageAlt = announcement.imageAlt,
                ctaLabel = announcement.ctaLabel,
                ctaTarget = announcement.ctaTarget,
                ctaPath = announcement.ctaTarget?.internalPath,
                placement = announcement.placement,
                homeVisible = announcement.homeVisible,
                featureKey = announcement.featureKey,
                displayPhase = announcement.resolveDisplayPhase(now),
                publishAt = announcement.publishAt,
                noticeEndsAt = announcement.noticeEndsAt,
                updatedAt = announcement.updatedAt,
                isRead = userState?.isRead ?: false,
                readAt = userState?.readAt,
                isDismissed = userState?.isDismissed ?: false,
                dismissedAt = userState?.dismissedAt
            )
        }
    }
}

data class AnnouncementUserStateResponse(
    val announcementId: Long,
    val userId: Long,
    val isRead: Boolean,
    val readAt: LocalDateTime?,
    val isDismissed: Boolean,
    val dismissedAt: LocalDateTime?
) {
    companion object {
        fun from(state: AnnouncementUserState): AnnouncementUserStateResponse {
            return AnnouncementUserStateResponse(
                announcementId = state.announcementId,
                userId = state.userId,
                isRead = state.isRead,
                readAt = state.readAt,
                isDismissed = state.isDismissed,
                dismissedAt = state.dismissedAt
            )
        }
    }
}

data class AnnouncementUnreadDotResponse(
    val hasUnread: Boolean,
    val unreadNoticeCount: Int
)

data class AnnouncementPlacementNoticeResponse(
    val placement: AnnouncementPlacement,
    val announcement: AnnouncementUserItemResponse?
)
