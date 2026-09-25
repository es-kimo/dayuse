package com.dayuse.domain.settlement

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table

@Entity
@Table(
    name = "deposit_report_items",
    indexes = [
        Index(name = "idx_deposit_report_item_report_id", columnList = "depositReportId"),
        Index(name = "idx_deposit_report_item_record_id", columnList = "dailyRecordId"),
        Index(name = "idx_deposit_report_item_period_id", columnList = "periodSettlementId")
    ]
)
class DepositReportItem(
    id: Long = 0L,

    depositReportId: Long = 0L,

    @Column(nullable = true)
    var dailyRecordId: Long? = null,

    @Column(nullable = true)
    var periodSettlementId: Long? = null
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var depositReportId: Long = depositReportId
        protected set
}
