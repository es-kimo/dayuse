package com.dayuse.domain.settlement

import org.springframework.data.jpa.repository.JpaRepository

interface DepositAuditLogRepository : JpaRepository<DepositAuditLog, Long> {
    fun findAllByDepositReportIdOrderByCreatedAtAsc(depositReportId: Long): List<DepositAuditLog>
}
