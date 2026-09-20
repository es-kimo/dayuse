package com.dayuse.domain.settlement

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "deposit_report_items",
    indexes = [
        Index(name = "idx_deposit_report_item_report_id", columnList = "depositReportId"),
        Index(name = "idx_deposit_report_item_record_id", columnList = "dailyRecordId")
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_deposit_report_item_report_record", columnNames = ["depositReportId", "dailyRecordId"])
    ]
)
class DepositReportItem(
    id: Long = 0L,

    depositReportId: Long = 0L,

    dailyRecordId: Long = 0L
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var depositReportId: Long = depositReportId
        protected set

    @Column(nullable = false)
    var dailyRecordId: Long = dailyRecordId
        protected set
}
