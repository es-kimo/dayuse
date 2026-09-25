package com.dayuse.domain.challenge.dto

import com.dayuse.domain.challenge.ChallengeStatus
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import jakarta.validation.Valid
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalDateTime

data class ChallengePeriodIntervalDto(
    val index: Int,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val targetCount: Int,
    val completedCount: Int,
    val isAchieved: Boolean
)

data class CreateParticipantRequest(
    val userId: Long,

    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val penaltyAmount: Int = 5000
)

data class CreateChallengeRequest(
    @field:NotBlank(message = "챌린지 제목은 필수입니다.")
    @field:Size(min = 1, max = 50, message = "챌린지 제목은 1자 이상 50자 이하여야 합니다.")
    val title: String,

    val description: String? = null,

    @field:NotBlank(message = "인증 기준은 필수입니다.")
    val verificationCriteria: String,

    val startDate: LocalDate,

    val endDate: LocalDate? = null,

    val periodType: PeriodType = PeriodType.DAILY,

    val targetFrequency: Int? = null,

    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val myPenaltyAmount: Int = 5000,

    @field:Valid
    val participants: List<CreateParticipantRequest>? = null
)

data class RestartChallengeRequest(
    @field:NotBlank(message = "챌린지 제목은 필수입니다.")
    @field:Size(min = 1, max = 50, message = "챌린지 제목은 1자 이상 50자 이하여야 합니다.")
    val title: String,

    val description: String? = null,

    @field:NotBlank(message = "인증 기준은 필수입니다.")
    val verificationCriteria: String,

    val startDate: LocalDate,

    val endDate: LocalDate? = null,

    val periodType: PeriodType = PeriodType.DAILY,

    val targetFrequency: Int? = null,

    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val myPenaltyAmount: Int = 5000
)

data class ChallengeRestartTemplateResponse(
    val challengeId: Long,
    val title: String,
    val description: String?,
    val verificationCriteria: String,
    val durationDays: Int,
    val periodType: PeriodType = PeriodType.DAILY,
    val targetFrequency: Int? = null,
    val suggestedStartDate: LocalDate,
    val suggestedEndDate: LocalDate,
    val suggestedPenaltyAmount: Int
)

data class UpdateChallengeRequest(
    @field:Size(max = 50, message = "챌린지 제목은 50자 이하여야 합니다.")
    val title: String? = null,

    val description: String? = null,

    val verificationCriteria: String? = null,

    val startDate: LocalDate? = null,

    val endDate: LocalDate? = null,

    val periodType: PeriodType? = null,

    val targetFrequency: Int? = null
)

data class JoinChallengeRequest(
    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val penaltyAmount: Int = 5000,

    val startDateType: StartDateType? = StartDateType.TOMORROW
)

data class UpdatePenaltyAmountRequest(
    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val penaltyAmount: Int
)

data class JoinOptionDto(
    val type: StartDateType,
    val startDate: LocalDate,
    val remainingDays: Int,
    val isRecommended: Boolean
)

data class JoinPreviewResponse(
    val challengeId: Long,
    val challengeTitle: String,
    val challengeStartDate: LocalDate,
    val challengeEndDate: LocalDate,
    val isStarted: Boolean,
    val options: List<JoinOptionDto>,
    val defaultPenaltyAmount: Int = 5000
)

data class ChallengeSummaryResponse(
    val id: Long,
    val groupId: Long,
    val title: String,
    val description: String?,
    val verificationCriteria: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val durationDays: Int = 14,
    val periodType: PeriodType = PeriodType.DAILY,
    val targetFrequency: Int? = null,
    val status: ChallengeStatus,
    val participantCount: Int,
    val isParticipating: Boolean,
    val isCreator: Boolean,
    val myPenaltyAmount: Int?,
    val createdAt: LocalDateTime
)

data class ChallengeParticipantResponse(
    val id: Long,
    val userId: Long,
    val nickname: String,
    val profileImageUrl: String?,
    val penaltyAmount: Int,
    val startDate: LocalDate = LocalDate.now(),
    val status: ParticipantStatus = ParticipantStatus.ACTIVE,
    val completionRate: Int = 0,
    val joinedAt: LocalDateTime,
    val isCreator: Boolean
)

data class ChallengeDetailResponse(
    val id: Long,
    val groupId: Long,
    val groupName: String,
    val creatorUserId: Long,
    val creatorNickname: String,
    val title: String,
    val description: String?,
    val verificationCriteria: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val durationDays: Int = 14,
    val periodType: PeriodType = PeriodType.DAILY,
    val targetFrequency: Int? = null,
    val totalTargetCount: Int = 14,
    val totalCompletedCount: Int = 0,
    val progressRate: Int = 0,
    val currentPeriod: ChallengePeriodIntervalDto? = null,
    val status: ChallengeStatus,
    val isCreator: Boolean,
    val isParticipating: Boolean,
    val myPenaltyAmount: Int?,
    val canJoin: Boolean,
    val canCancel: Boolean,
    val canDelete: Boolean,
    val canModifyFull: Boolean,
    val participants: List<ChallengeParticipantResponse>
)
