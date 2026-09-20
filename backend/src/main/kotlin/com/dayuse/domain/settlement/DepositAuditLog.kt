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

@Entity
@Table(
    name = "deposit_audit_logs",
    indexes = [
        Index(name = "idx_deposit_audit_log_report_id", columnList = "depositReportId"),
        Index(name = "idx_deposit_audit_log_actor_id", columnList = "actorUserId")
    ]
)
class DepositAuditLog(
    id: Long = 0L,

    depositReportId: Long = 0L,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    var action: DepositAuditAction = DepositAuditAction.REPORTED,

    @Column(nullable = false)
    var actorUserId: Long = 0L,

    @Column(length = 255)
    var reason: String? = null
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var depositReportId: Long = depositReportId
        protected set
}
