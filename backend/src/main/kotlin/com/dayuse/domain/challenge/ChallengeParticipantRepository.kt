package com.dayuse.domain.challenge

import org.springframework.data.jpa.repository.JpaRepository

interface ChallengeParticipantRepository : JpaRepository<ChallengeParticipant, Long> {
    fun findAllByChallengeId(challengeId: Long): List<ChallengeParticipant>
    fun findAllByUserId(userId: Long): List<ChallengeParticipant>
    fun findByChallengeIdAndUserId(challengeId: Long, userId: Long): ChallengeParticipant?
    fun existsByChallengeIdAndUserId(challengeId: Long, userId: Long): Boolean
    fun countByChallengeId(challengeId: Long): Long
    fun deleteAllByChallengeId(challengeId: Long)
}
