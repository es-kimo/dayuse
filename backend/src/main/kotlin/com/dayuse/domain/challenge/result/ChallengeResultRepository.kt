package com.dayuse.domain.challenge.result

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.Optional

@Repository
interface ChallengeResultRepository : JpaRepository<ChallengeResult, Long> {
    fun findByChallengeId(challengeId: Long): Optional<ChallengeResult>
    fun findAllByGroupId(groupId: Long): List<ChallengeResult>
    fun findAllByStatus(status: ChallengeResultStatus): List<ChallengeResult>
    fun existsByChallengeId(challengeId: Long): Boolean
}
