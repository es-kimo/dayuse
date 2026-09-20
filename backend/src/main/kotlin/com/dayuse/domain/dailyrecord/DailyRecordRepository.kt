package com.dayuse.domain.dailyrecord

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface DailyRecordRepository : JpaRepository<DailyRecord, Long> {

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
        SELECT COUNT(r)
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.UNCHECKED
               OR (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.WAITING AND r.date < :today))
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
          AND (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.UNCHECKED
               OR (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.WAITING AND r.date < :today))
        ORDER BY r.date ASC
    """
    )
    fun findUncheckedRecords(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long,
        @Param("today") today: LocalDate
    ): List<DailyRecord>
}
