package com.dayuse.domain.ad

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface AdSessionRepository : JpaRepository<AdSession, Long> {

    fun findBySessionToken(sessionToken: String): AdSession?

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM AdSession s WHERE s.sessionToken = :sessionToken")
    fun findBySessionTokenWithLock(@Param("sessionToken") sessionToken: String): AdSession?

    /**
     * 사용자의 진행 가능 상태(ISSUED, IMPRESSED) 세션을 비관적 잠금으로 조회합니다.
     * 계정당 동시에 진행 중인 활성 세션 1개 제한을 보장하기 위해 사용합니다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT s FROM AdSession s
        WHERE s.userId = :userId
          AND s.status IN (
              com.dayuse.domain.ad.AdSessionStatus.ISSUED,
              com.dayuse.domain.ad.AdSessionStatus.IMPRESSED
          )
        ORDER BY s.issuedAt DESC
        """
    )
    fun findActiveCandidateSessionsByUserIdWithLock(@Param("userId") userId: Long): List<AdSession>

    /**
     * 특정 캠페인에서 특정 사용자가 주어진 기간(당일 KST 00:00 ~ 익일 00:00) 동안
     * 실제로 화면에 노출된(`impressionAt IS NOT NULL`) 세션 건수를 집계합니다.
     * - 단순 발급(`served`)만 되고 노출되지 않은 세션은 차감하지 않습니다.
     */
    @Query(
        """
        SELECT COUNT(s) FROM AdSession s
        WHERE s.campaignId = :campaignId
          AND s.userId = :userId
          AND s.impressionAt IS NOT NULL
          AND s.impressionAt >= :startOfDay
          AND s.impressionAt < :endOfDay
        """
    )
    fun countActualImpressionsByCampaignAndUserBetween(
        @Param("campaignId") campaignId: Long,
        @Param("userId") userId: Long,
        @Param("startOfDay") startOfDay: LocalDateTime,
        @Param("endOfDay") endOfDay: LocalDateTime
    ): Long
}
