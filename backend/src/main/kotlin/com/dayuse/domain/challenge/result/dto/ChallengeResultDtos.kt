package com.dayuse.domain.challenge.result.dto

import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.ChallengeParticipantResult
import com.dayuse.domain.challenge.result.ChallengeResult
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import java.time.LocalDate
import java.time.LocalDateTime

data class ChallengeParticipantResultResponse(
    val id: Long,
    val challengeParticipantId: Long,
    val userId: Long,
    val participantStartDate: LocalDate,
    val targetCount: Int,
    val completedCount: Int,
    val contributionCount: Int,
    val actualSubmissionCount: Int,
    val achievementRate: Double?,
    val isSuccess: Boolean
) {
    companion object {
        fun from(entity: ChallengeParticipantResult): ChallengeParticipantResultResponse {
            return ChallengeParticipantResultResponse(
                id = entity.id,
                challengeParticipantId = entity.challengeParticipantId,
                userId = entity.userId,
                participantStartDate = entity.participantStartDate,
                targetCount = entity.targetCount,
                completedCount = entity.completedCount,
                contributionCount = entity.contributionCount,
                actualSubmissionCount = entity.actualSubmissionCount,
                achievementRate = entity.achievementRate,
                isSuccess = entity.isSuccess
            )
        }
    }
}

data class ChallengeResultResponse(
    val id: Long,
    val challengeId: Long,
    val groupId: Long,
    val status: ChallengeResultStatus,
    val policyVersion: String,
    val executionType: ExecutionType,
    val periodType: PeriodType,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val totalTargetCount: Int,
    val totalCompletedCount: Int,
    val achievementRate: Double?,
    val isSuccess: Boolean,
    val abortedAt: LocalDateTime?,
    val abortReason: String?,
    val provisionalAt: LocalDateTime?,
    val confirmedAt: LocalDateTime?,
    val participants: List<ChallengeParticipantResultResponse>
) {
    companion object {
        fun of(
            result: ChallengeResult,
            participants: List<ChallengeParticipantResult>
        ): ChallengeResultResponse {
            return ChallengeResultResponse(
                id = result.id,
                challengeId = result.challengeId,
                groupId = result.groupId,
                status = result.status,
                policyVersion = result.policyVersion,
                executionType = result.executionType,
                periodType = result.periodType,
                startDate = result.startDate,
                endDate = result.endDate,
                totalTargetCount = result.totalTargetCount,
                totalCompletedCount = result.totalCompletedCount,
                achievementRate = result.achievementRate,
                isSuccess = result.isSuccess,
                abortedAt = result.abortedAt,
                abortReason = result.abortReason,
                provisionalAt = result.provisionalAt,
                confirmedAt = result.confirmedAt,
                participants = participants.map { ChallengeParticipantResultResponse.from(it) }
            )
        }
    }
}
