package com.dayuse.domain.settlement

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(
    name = "deposit_reports",
    indexes = [
        Index(name = "idx_deposit_report_group_id", columnList = "groupId"),
        Index(name = "idx_deposit_report_user_id", columnList = "userId"),
        Index(name = "idx_deposit_report_status", columnList = "status")
    ]
)
class DepositReport(
    id: Long = 0L,

    groupId: Long = 0L,

    userId: Long = 0L,

    @Column(nullable = false, length = 50)
    var depositorName: String = "",

    @Column(nullable = false)
    var depositDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    var totalAmount: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var status: DepositReportStatus = DepositReportStatus.WAITING_CONFIRMATION,

    @Column(length = 255)
    var rejectReason: String? = null,

    @Column(length = 255)
    var cancelReason: String? = null,

    var processedByUserId: Long? = null,

    var processedAt: LocalDateTime? = null
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var groupId: Long = groupId
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    fun cancelByUser() {
        this.status = DepositReportStatus.CANCELLED
        this.cancelReason = "사용자 직접 취소"
        this.processedByUserId = userId
        this.processedAt = LocalDateTime.now()
    }

    fun confirmByHost(hostUserId: Long) {
        this.status = DepositReportStatus.CONFIRMED
        this.processedByUserId = hostUserId
        this.processedAt = LocalDateTime.now()
    }

    fun rejectByHost(hostUserId: Long, reason: String) {
        this.status = DepositReportStatus.REJECTED
        this.rejectReason = reason
        this.processedByUserId = hostUserId
        this.processedAt = LocalDateTime.now()
    }

    fun cancelConfirmationByHost(hostUserId: Long, reason: String) {
        this.status = DepositReportStatus.CANCELLED
        this.cancelReason = reason
        this.processedByUserId = hostUserId
        this.processedAt = LocalDateTime.now()
    }
}
