package com.dayuse.domain.settlement

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface DepositReportRepository : JpaRepository<DepositReport, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM DepositReport r WHERE r.id = :id")
    fun findByIdWithLock(@Param("id") id: Long): DepositReport?

    fun findAllByGroupIdOrderByCreatedAtDesc(groupId: Long): List<DepositReport>

    fun findAllByGroupIdAndStatusOrderByCreatedAtDesc(
        groupId: Long,
        status: DepositReportStatus
    ): List<DepositReport>

    fun findAllByGroupIdAndUserIdOrderByCreatedAtDesc(
        groupId: Long,
        userId: Long
    ): List<DepositReport>

    @Query(
        """
        SELECT COALESCE(SUM(dr.totalAmount), 0)
        FROM DepositReport dr
        WHERE dr.groupId = :groupId
          AND dr.status = com.dayuse.domain.settlement.DepositReportStatus.WAITING_CONFIRMATION
    """
    )
    fun calculateWaitingAmount(@Param("groupId") groupId: Long): Int

    @Query(
        """
        SELECT COALESCE(SUM(dr.totalAmount), 0)
        FROM DepositReport dr
        WHERE dr.groupId = :groupId
          AND dr.status = com.dayuse.domain.settlement.DepositReportStatus.CONFIRMED
    """
    )
    fun calculateConfirmedAmount(@Param("groupId") groupId: Long): Int
}
