package com.dayuse.domain.redayticket

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface RedayTicketRepository : JpaRepository<RedayTicket, Long> {

    fun findAllByUserIdAndStatus(userId: Long, status: RedayTicketStatus): List<RedayTicket>

    fun countByUserIdAndStatus(userId: Long, status: RedayTicketStatus): Long

    fun findAllByUserId(userId: Long): List<RedayTicket>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM RedayTicket t WHERE t.id = :id")
    fun findByIdWithLock(@Param("id") id: Long): RedayTicket?

    fun findByUsedDailyRecordId(usedDailyRecordId: Long): RedayTicket?

    fun findBySourceAndSourceReference(source: RedayTicketSource, sourceReference: String): RedayTicket?

    fun countBySourceAndSourceReference(source: RedayTicketSource, sourceReference: String): Long

    /**
     * 특정 사용자의 사용 가능한 티켓 중 가장 오래된 것을 비관적 잠금으로 조회합니다.
     * FIFO 소비 정책.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(
        """
        SELECT t FROM RedayTicket t
        WHERE t.userId = :userId AND t.status = com.dayuse.domain.redayticket.RedayTicketStatus.AVAILABLE
        ORDER BY t.createdAt ASC
        """
    )
    fun findFirstAvailableByUserIdWithLock(@Param("userId") userId: Long): List<RedayTicket>
}
