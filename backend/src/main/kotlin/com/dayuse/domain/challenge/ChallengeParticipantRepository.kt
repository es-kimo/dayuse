package com.dayuse.domain.challenge

import org.springframework.data.jpa.repository.JpaRepository

interface ChallengeParticipantRepository : JpaRepository<ChallengeParticipant, Long> {
    fun findAllByChallengeId(challengeId: Long): List<ChallengeParticipant>
    fun findAllByChallengeIdAndStatus(challengeId: Long, status: ParticipantStatus): List<ChallengeParticipant>
    fun findAllByUserId(userId: Long): List<ChallengeParticipant>
    fun findAllByUserIdAndStatus(userId: Long, status: ParticipantStatus): List<ChallengeParticipant>
    fun findByChallengeIdAndUserId(challengeId: Long, userId: Long): ChallengeParticipant?
    fun findByChallengeIdAndUserIdAndStatus(challengeId: Long, userId: Long, status: ParticipantStatus): ChallengeParticipant?
    fun existsByChallengeIdAndUserId(challengeId: Long, userId: Long): Boolean
    fun existsByChallengeIdAndUserIdAndStatus(challengeId: Long, userId: Long, status: ParticipantStatus): Boolean
    fun countByChallengeId(challengeId: Long): Long
    fun countByChallengeIdAndStatus(challengeId: Long, status: ParticipantStatus): Long
    fun deleteAllByChallengeId(challengeId: Long)
}
