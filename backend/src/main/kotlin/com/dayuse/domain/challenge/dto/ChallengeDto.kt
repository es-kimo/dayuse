package com.dayuse.domain.challenge.dto

import com.dayuse.domain.challenge.ChallengeStatus
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalDateTime

data class CreateChallengeRequest(
    @field:NotBlank(message = "챌린지 제목은 필수입니다.")
    @field:Size(min = 1, max = 50, message = "챌린지 제목은 1자 이상 50자 이하여야 합니다.")
    val title: String,

    val description: String? = null,

    @field:NotBlank(message = "인증 기준은 필수입니다.")
    val verificationCriteria: String,

    val startDate: LocalDate,

    val endDate: LocalDate? = null,

    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val myPenaltyAmount: Int = 5000
)

data class UpdateChallengeRequest(
    @field:Size(max = 50, message = "챌린지 제목은 50자 이하여야 합니다.")
    val title: String? = null,

    val description: String? = null,

    val verificationCriteria: String? = null,

    val startDate: LocalDate? = null,

    val endDate: LocalDate? = null
)

data class JoinChallengeRequest(
    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val penaltyAmount: Int = 5000
)

data class UpdatePenaltyAmountRequest(
    @field:Min(value = 0, message = "약정 벌금은 0원 이상이어야 합니다.")
    val penaltyAmount: Int
)

data class ChallengeSummaryResponse(
    val id: Long,
    val groupId: Long,
    val title: String,
    val description: String?,
    val verificationCriteria: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
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
