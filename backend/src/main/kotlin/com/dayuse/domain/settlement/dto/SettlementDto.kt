package com.dayuse.domain.settlement.dto

import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.settlement.DepositAuditAction
import com.dayuse.domain.settlement.DepositReportStatus
import jakarta.validation.constraints.Min
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotEmpty
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalDateTime

data class GroupAccountRequest(
    @field:NotBlank(message = "은행명을 입력해 주세요.")
    @field:Size(max = 50, message = "은행명은 최대 50자까지 가능합니다.")
    val bankName: String,

    @field:NotBlank(message = "계좌번호를 입력해 주세요.")
    @field:Size(max = 50, message = "계좌번호는 최대 50자까지 가능합니다.")
    val accountNumber: String,

    @field:NotBlank(message = "예금주를 입력해 주세요.")
    @field:Size(max = 50, message = "예금주는 최대 50자까지 가능합니다.")
    val accountHolder: String
)

data class GroupAccountResponse(
    val id: Long,
    val groupId: Long,
    val bankName: String,
    val accountNumber: String,
    val accountHolder: String,
    val updatedAt: LocalDateTime?
)

data class UnpaidRecordItemResponse(
    val id: Long,
    val challengeId: Long,
    val challengeTitle: String,
    val date: LocalDate,
    val penaltyAmount: Int,
    val status: DailyRecordStatus?,
    val isPeriod: Boolean = false,
    val periodIndex: Int? = null,
    val periodStartDate: LocalDate? = null,
    val periodEndDate: LocalDate? = null,
    val targetCount: Int? = null,
    val completedCount: Int? = null,
    val missedCount: Int? = null
)

data class CreateDepositReportRequest(
    @field:NotBlank(message = "입금자명을 입력해 주세요.")
    @field:Size(max = 50, message = "입금자명은 최대 50자까지 가능합니다.")
    val depositorName: String,

    @field:NotNull(message = "실제 입금일을 선택해 주세요.")
    val depositDate: LocalDate,

    @field:Min(value = 1, message = "신고 총액은 0원보다 커야 합니다.")
    val totalAmount: Int,

    val dailyRecordIds: List<Long> = emptyList(),
    val periodSettlementIds: List<Long> = emptyList()
)

data class RejectDepositReportRequest(
    @field:NotBlank(message = "반려 사유를 입력해 주세요.")
    @field:Size(max = 255, message = "반려 사유는 최대 255자까지 가능합니다.")
    val reason: String
)

data class CancelConfirmationRequest(
    @field:NotBlank(message = "확인 취소 사유를 입력해 주세요.")
    @field:Size(max = 255, message = "확인 취소 사유는 최대 255자까지 가능합니다.")
    val reason: String
)

data class DepositReportItemResponse(
    val id: Long,
    val dailyRecordId: Long?,
    val periodSettlementId: Long? = null,
    val date: LocalDate?,
    val challengeId: Long,
    val challengeTitle: String,
    val penaltyAmount: Int,
    val isPeriod: Boolean = false,
    val periodIndex: Int? = null,
    val periodStartDate: LocalDate? = null,
    val periodEndDate: LocalDate? = null,
    val targetCount: Int? = null,
    val completedCount: Int? = null,
    val missedCount: Int? = null
)

data class DepositAuditLogResponse(
    val id: Long,
    val action: DepositAuditAction,
    val actorUserId: Long,
    val actorNickname: String?,
    val reason: String?,
    val createdAt: LocalDateTime
)

data class DepositReportDetailResponse(
    val id: Long,
    val groupId: Long,
    val userId: Long,
    val userNickname: String,
    val userProfileImageUrl: String?,
    val depositorName: String,
    val depositDate: LocalDate,
    val totalAmount: Int,
    val status: DepositReportStatus,
    val rejectReason: String?,
    val cancelReason: String?,
    val processedByUserId: Long?,
    val processedByNickname: String?,
    val processedAt: LocalDateTime?,
    val createdAt: LocalDateTime,
    val items: List<DepositReportItemResponse>,
    val auditLogs: List<DepositAuditLogResponse>
)

data class SettlementSummaryResponse(
    val groupId: Long,
    val unpaidAmount: Int,
    val waitingAmount: Int,
    val confirmedAmount: Int,
    val myUnpaidAmount: Int,
    val accountRegistered: Boolean,
    val account: GroupAccountResponse?
)
