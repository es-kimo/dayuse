package com.dayuse.domain.challenge.result

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface ChallengeParticipantResultRepository : JpaRepository<ChallengeParticipantResult, Long> {
    fun findAllByChallengeResultId(challengeResultId: Long): List<ChallengeParticipantResult>
    fun findAllByChallengeId(challengeId: Long): List<ChallengeParticipantResult>
    fun findByChallengeIdAndUserId(challengeId: Long, userId: Long): Optional<ChallengeParticipantResult>
    fun deleteAllByChallengeId(challengeId: Long)
}
