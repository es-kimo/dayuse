package com.dayuse.domain.dailyrecord

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

// DailyRecord.currentStatus(today)가 UNCHECKED인 조건. 목록과 건수에 같은 조건을 사용한다.
private const val UNCHECKED_CONDITION = """
    r.date < :today
    AND r.status IN (com.dayuse.domain.dailyrecord.DailyRecordStatus.PLANNED,
                     com.dayuse.domain.dailyrecord.DailyRecordStatus.WAITING,
                     com.dayuse.domain.dailyrecord.DailyRecordStatus.UNCHECKED)
"""

interface DailyRecordRepository : JpaRepository<DailyRecord, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM DailyRecord r WHERE r.id IN :ids")
    fun findAllByIdInWithLock(@Param("ids") ids: Collection<Long>): List<DailyRecord>

    fun findByChallengeParticipantIdAndDate(
        challengeParticipantId: Long,
        date: LocalDate
    ): DailyRecord?

    fun findByChallengeIdAndUserIdAndDate(
        challengeId: Long,
        userId: Long,
        date: LocalDate
    ): DailyRecord?

    fun findAllByChallengeParticipantId(challengeParticipantId: Long): List<DailyRecord>

    fun findAllByChallengeId(challengeId: Long): List<DailyRecord>

    fun findAllByChallengeIdAndDate(
        challengeId: Long,
        date: LocalDate
    ): List<DailyRecord>

    fun findAllByGroupIdAndUserId(
        groupId: Long,
        userId: Long
    ): List<DailyRecord>

    fun findAllByVerificationId(verificationId: Long): List<DailyRecord>

    @Query(
        """
        SELECT COALESCE(SUM(r.penaltyAmount), 0) 
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.FAILED
          AND r.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
    """
    )
    fun calculateUnpaidPenaltyAmount(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long
    ): Int

    @Query(
        """
        SELECT COALESCE(SUM(r.penaltyAmount), 0)
        FROM DailyRecord r
        WHERE r.groupId = :groupId
          AND r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.FAILED
          AND r.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
    """
    )
    fun calculateGroupUnpaidPenaltyAmount(
        @Param("groupId") groupId: Long
    ): Int

    @Query(
        """
        SELECT r
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.FAILED
          AND r.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
          AND r.penaltyAmount > 0
        ORDER BY r.date ASC
    """
    )
    fun findUnpaidRecordsForDeposit(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long
    ): List<DailyRecord>

    @Query(
        """
        SELECT COUNT(r)
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND ($UNCHECKED_CONDITION)
    """
    )
    fun countUncheckedRecords(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long,
        @Param("today") today: LocalDate
    ): Long

    @Query(
        """
        SELECT r
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND ($UNCHECKED_CONDITION)
        ORDER BY r.date ASC
    """
    )
    fun findUncheckedRecords(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long,
        @Param("today") today: LocalDate
    ): List<DailyRecord>
}
