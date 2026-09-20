package com.dayuse.domain.verification

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate

interface VerificationRepository : JpaRepository<Verification, Long> {
    fun existsByChallengeIdAndUserIdAndTargetDate(challengeId: Long, userId: Long, targetDate: LocalDate): Boolean

    fun findByChallengeIdAndUserIdAndTargetDate(challengeId: Long, userId: Long, targetDate: LocalDate): Verification?

    fun findByGroupIdOrderByCreatedAtDesc(groupId: Long, pageable: Pageable): Page<Verification>

    fun findAllByChallengeIdAndUserIdAndTargetDateIn(
        challengeId: Long,
        userId: Long,
        dates: List<LocalDate>
    ): List<Verification>

    fun findAllByGroupIdAndTargetDate(groupId: Long, targetDate: LocalDate): List<Verification>
}
