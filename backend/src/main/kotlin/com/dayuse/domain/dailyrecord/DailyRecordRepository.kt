package com.dayuse.domain.dailyrecord

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface DailyRecordRepository : JpaRepository<DailyRecord, Long> {

    // TODO [사용자 미션 5-1]: 입금 신고 시 동시성 충돌(이중 신고)을 방지하기 위해 비관적 락(SELECT ... FOR UPDATE)을 거는 쿼리 메서드를 완성해 보세요.
    // 🎓 핵심 질문: 돈과 정산이 오가는 도메인에서 동시성 문제(이중 입금 신고, 동시 승인)를 InnoDB 비관적 락(SELECT ... FOR UPDATE)으로 어떻게 해결할 수 있을까요?
    // 힌트: @Lock(LockModeType.PESSIMISTIC_WRITE) 어노테이션을 부착하여 조회 시점에 쓰기 락을 획득하도록 설정합니다.
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
