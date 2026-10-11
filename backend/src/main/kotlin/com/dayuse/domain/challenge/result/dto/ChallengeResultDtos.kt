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
    val isSuccess: Boolean,
    val acknowledgedAt: LocalDateTime? = null,
    val isAcknowledged: Boolean = false,
    val isRevised: Boolean = false,
    val lateCount: Int = 0,
    val coinRewardCount: Int = 0,
    val coinExcludedDaysCount: Int = 0,
    val coinGrantStatus: String = "NONE"
) {
    companion object {
        fun from(
            entity: ChallengeParticipantResult,
            currentRevision: Int = 1,
            lateCount: Int = 0,
            coinRewardCount: Int = 0,
            coinExcludedDaysCount: Int = 0,
            coinGrantStatus: String = "NONE"
        ): ChallengeParticipantResultResponse {
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
                isSuccess = entity.isSuccess,
                acknowledgedAt = entity.acknowledgedAt,
                isAcknowledged = entity.isAcknowledged(currentRevision),
                isRevised = entity.isRevised(currentRevision),
                lateCount = lateCount,
                coinRewardCount = coinRewardCount,
                coinExcludedDaysCount = coinExcludedDaysCount,
                coinGrantStatus = coinGrantStatus
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
    val revision: Int = 1,
    val participants: List<ChallengeParticipantResultResponse>
) {
    companion object {
        fun of(
            result: ChallengeResult,
            participants: List<ChallengeParticipantResult>,
            lateCountMap: Map<Long, Int> = emptyMap(),
            coinRewardMap: Map<Long, Int> = emptyMap(),
            coinExclusionMap: Map<Long, Int> = emptyMap(),
            coinStatusMap: Map<Long, String> = emptyMap()
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
                revision = result.revision,
                participants = participants.map {
                    ChallengeParticipantResultResponse.from(
                        entity = it,
                        currentRevision = result.revision,
                        lateCount = lateCountMap[it.userId] ?: 0,
                        coinRewardCount = coinRewardMap[it.userId] ?: 0,
                        coinExcludedDaysCount = coinExclusionMap[it.userId] ?: 0,
                        coinGrantStatus = coinStatusMap[it.userId] ?: "NONE"
                    )
                }
            )
        }
    }
}

data class EndedChallengeSummaryItem(
    val challengeId: Long,
    val groupId: Long,
    val groupName: String,
    val challengeTitle: String,
    val status: ChallengeResultStatus,
    val executionType: ExecutionType,
    val periodType: PeriodType,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val targetCount: Int,
    val completedCount: Int,
    val achievementRate: Double?,
    val isSuccess: Boolean,
    val isAcknowledged: Boolean,
    val isRevised: Boolean,
    val acknowledgedAt: LocalDateTime?,
    val abortedAt: LocalDateTime?,
    val abortReason: String?,
    val coinRewardCount: Int = 0,
    val coinGrantStatus: String = "NONE"
)

data class EndedChallengesSummaryResponse(
    val unacknowledgedCount: Int,
    val items: List<EndedChallengeSummaryItem>
)
