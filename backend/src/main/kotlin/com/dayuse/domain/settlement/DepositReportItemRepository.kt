package com.dayuse.domain.settlement

import org.springframework.data.jpa.repository.JpaRepository

interface DepositReportItemRepository : JpaRepository<DepositReportItem, Long> {
    fun findAllByDepositReportId(depositReportId: Long): List<DepositReportItem>
    fun findAllByDepositReportIdIn(depositReportIds: Collection<Long>): List<DepositReportItem>
    fun existsByDailyRecordId(dailyRecordId: Long): Boolean
}
