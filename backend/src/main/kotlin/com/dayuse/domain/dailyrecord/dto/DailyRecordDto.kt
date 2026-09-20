package com.dayuse.domain.dailyrecord.dto

import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import jakarta.validation.constraints.NotBlank
import java.time.LocalDate
import java.time.LocalDateTime

data class StatusSummaryResponse(
    val groupId: Long,
    val uncheckedCount: Long,
    val unpaidPenaltyAmount: Int
)

data class UncheckedRecordResponse(
    val id: Long,
    val challengeId: Long,
    val challengeTitle: String,
    val date: LocalDate,
    val status: DailyRecordStatus,
    val penaltyAmount: Int,
    val verificationCriteria: String
)

data class LateVerificationRequest(
    @field:NotBlank(message = "인증 이미지 URL은 필수입니다.")
    val imageUrl: String,

    val comment: String? = null
)

data class DailyRecordDetailResponse(
    val id: Long,
    val groupId: Long,
    val challengeId: Long,
    val challengeParticipantId: Long,
    val userId: Long,
    val date: LocalDate,
    val status: DailyRecordStatus,
    val penaltyAmount: Int,
    val depositStatus: DepositStatus,
    val verificationId: Long?,
    val isLate: Boolean,
    val failedAt: LocalDateTime?
)

data class CalendarDailyRecordItem(
    val id: Long,
    val date: LocalDate,
    val status: DailyRecordStatus,
    val penaltyAmount: Int,
    val depositStatus: DepositStatus,
    val isLate: Boolean,
    val verificationId: Long?,
    val imageUrl: String?,
    val comment: String?
)

data class ParticipantCalendarItem(
    val userId: Long,
    val nickname: String,
    val profileImageUrl: String?,
    val records: List<CalendarDailyRecordItem>
)

data class ChallengeCalendarResponse(
    val challengeId: Long,
    val title: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val participants: List<ParticipantCalendarItem>
)
