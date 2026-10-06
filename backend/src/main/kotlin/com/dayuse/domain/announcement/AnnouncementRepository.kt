package com.dayuse.domain.announcement

import org.springframework.data.jpa.repository.JpaRepository

interface AnnouncementRepository : JpaRepository<Announcement, Long> {
    fun findAllByStatusOrderByPublishAtDescIdDesc(status: AnnouncementStatus): List<Announcement>

    fun findAllByOrderByCreatedAtDescIdDesc(): List<Announcement>
}
