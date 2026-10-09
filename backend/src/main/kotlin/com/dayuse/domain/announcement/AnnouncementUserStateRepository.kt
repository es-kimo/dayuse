package com.dayuse.domain.announcement

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface AnnouncementUserStateRepository : JpaRepository<AnnouncementUserState, Long> {
    fun findByUserIdAndAnnouncementId(userId: Long, announcementId: Long): AnnouncementUserState?

    fun findAllByUserId(userId: Long): List<AnnouncementUserState>

    fun findAllByUserIdAndAnnouncementIdIn(
        userId: Long,
        announcementIds: Collection<Long>
    ): List<AnnouncementUserState>

    @Modifying
    @Query(
        value = """
        INSERT INTO announcement_user_states (user_id, announcement_id, read_at, dismissed_at, created_at, updated_at)
        VALUES (:userId, :announcementId, :now, NULL, :now, :now)
        ON DUPLICATE KEY UPDATE
            read_at = COALESCE(read_at, VALUES(read_at)),
            updated_at = CASE WHEN read_at IS NULL THEN VALUES(updated_at) ELSE updated_at END
        """,
        nativeQuery = true
    )
    fun upsertReadNative(
        @Param("userId") userId: Long,
        @Param("announcementId") announcementId: Long,
        @Param("now") now: LocalDateTime
    ): Int

    @Modifying
    @Query(
        value = """
        INSERT INTO announcement_user_states (user_id, announcement_id, read_at, dismissed_at, created_at, updated_at)
        VALUES (:userId, :announcementId, NULL, :now, :now, :now)
        ON DUPLICATE KEY UPDATE
            dismissed_at = COALESCE(dismissed_at, VALUES(dismissed_at)),
            updated_at = CASE WHEN dismissed_at IS NULL THEN VALUES(updated_at) ELSE updated_at END
        """,
        nativeQuery = true
    )
    fun upsertDismissedNative(
        @Param("userId") userId: Long,
        @Param("announcementId") announcementId: Long,
        @Param("now") now: LocalDateTime
    ): Int
}
