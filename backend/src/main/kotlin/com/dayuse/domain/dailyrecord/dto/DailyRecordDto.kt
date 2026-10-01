package com.dayuse.domain.dailyrecord.dto

import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.dailyrecord.RedayIneligibleReason
import com.dayuse.domain.dailyrecord.VerificationTimePhase
import jakarta.validation.constraints.NotBlank
import java.time.LocalDate
import java.time.LocalDateTime

data class StatusSummaryResponse(
    val groupId: Long,
    val uncheckedCount: Long,
    val unpaidPenaltyAmount: Int,
    val pendingPenaltyAmount: Int = 0,
    val verifiedUserIds: List<Long> = emptyList()
)

data class UncheckedRecordResponse(
    val id: Long,
    val challengeId: Long,
    val challengeTitle: String,
    val date: LocalDate,
    val status: DailyRecordStatus,
    val penaltyAmount: Int,
    val verificationCriteria: String,
    val redayAllowed: Boolean = false,
    val penaltyStatus: PenaltyStatus = PenaltyStatus.NONE,
    val redayDeadline: LocalDateTime? = null
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
    val failedAt: LocalDateTime?,
    val penaltyStatus: PenaltyStatus = PenaltyStatus.NONE,
    val redayApplied: Boolean = false,
    val redayAppliedAt: LocalDateTime? = null,
    val redayDeadline: LocalDateTime? = null
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
    val comment: String?,
    val penaltyStatus: PenaltyStatus = PenaltyStatus.NONE,
    val redayApplied: Boolean = false,
    val redayAppliedAt: LocalDateTime? = null,
    val redayDeadline: LocalDateTime? = null
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
    val redayAllowed: Boolean = false,
    val participants: List<ParticipantCalendarItem>
)

/**
 * 모임 홈에서 "지금 리데이를 쓸 수 있는 내 기록" 한 건 (v0.11 F11)
 *
 * 본인 기록만 담는다. 보유 티켓 잔액과 광고 시청 이력은 모임원에게 공개하지 않으므로
 * 이 응답에도 넣지 않는다. 화면은 잔액이 필요하면 본인 전용 잔액 API를 따로 조회한다.
 */
data class RedayCandidateResponse(
    val recordId: Long,
    val challengeId: Long,
    val challengeTitle: String,
    val targetDate: LocalDate,
    val penaltyAmount: Int,
    val penaltyStatus: PenaltyStatus,
    val redayDeadline: LocalDateTime,
    val remainingSeconds: Long
)

data class RedayEligibilityResponse(
    val recordId: Long,
    val verificationId: Long?,
    val challengeId: Long,
    val targetDate: LocalDate,
    val eligible: Boolean,
    val reason: RedayIneligibleReason,
    val reasonMessage: String,
    val redayAllowed: Boolean,
    val timePhase: VerificationTimePhase,
    val penaltyAmount: Int,
    val penaltyStatus: PenaltyStatus,
    val redayApplied: Boolean,
    val redayDeadline: LocalDateTime,
    val remainingSeconds: Long
)
