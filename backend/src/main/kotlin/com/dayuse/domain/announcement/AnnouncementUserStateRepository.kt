package com.dayuse.domain.announcement

import org.springframework.data.jpa.repository.JpaRepository

interface AnnouncementUserStateRepository : JpaRepository<AnnouncementUserState, Long> {
    fun findByUserIdAndAnnouncementId(userId: Long, announcementId: Long): AnnouncementUserState?

    fun findAllByUserId(userId: Long): List<AnnouncementUserState>

    fun findAllByUserIdAndAnnouncementIdIn(
        userId: Long,
        announcementIds: Collection<Long>
    ): List<AnnouncementUserState>
}
