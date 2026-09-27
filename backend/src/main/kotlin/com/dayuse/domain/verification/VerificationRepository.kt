package com.dayuse.domain.verification

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface VerificationRepository : JpaRepository<Verification, Long> {
    fun existsByChallengeIdAndUserIdAndTargetDate(challengeId: Long, userId: Long, targetDate: LocalDate): Boolean

    fun existsByChallengeIdAndTargetDate(challengeId: Long, targetDate: LocalDate): Boolean

    fun countByChallengeIdAndTargetDate(challengeId: Long, targetDate: LocalDate): Long

    fun findByChallengeIdAndUserIdAndTargetDate(challengeId: Long, userId: Long, targetDate: LocalDate): Verification?

    fun findByGroupIdOrderByCreatedAtDesc(groupId: Long, pageable: Pageable): Page<Verification>

    fun findAllByChallengeId(challengeId: Long): List<Verification>

    fun findAllByChallengeIdAndTargetDate(challengeId: Long, targetDate: LocalDate): List<Verification>

    fun findAllByChallengeIdAndUserIdAndTargetDateIn(
        challengeId: Long,
        userId: Long,
        dates: List<LocalDate>
    ): List<Verification>

    fun findAllByGroupIdAndTargetDate(groupId: Long, targetDate: LocalDate): List<Verification>

    @Query("SELECT DISTINCT v.targetDate FROM Verification v WHERE v.challengeId = :challengeId")
    fun findDistinctTargetDatesByChallengeId(@Param("challengeId") challengeId: Long): List<LocalDate>

    @Query("SELECT DISTINCT v.targetDate FROM Verification v WHERE v.challengeId = :challengeId AND v.targetDate BETWEEN :startDate AND :endDate")
    fun findDistinctTargetDatesByChallengeIdAndDateBetween(
        @Param("challengeId") challengeId: Long,
        @Param("startDate") startDate: LocalDate,
        @Param("endDate") endDate: LocalDate
    ): List<LocalDate>
}
