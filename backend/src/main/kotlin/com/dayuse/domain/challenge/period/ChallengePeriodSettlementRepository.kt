package com.dayuse.domain.challenge.period

import com.dayuse.domain.dailyrecord.DepositStatus
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ChallengePeriodSettlementRepository : JpaRepository<ChallengePeriodSettlement, Long> {
    fun findByChallengeParticipantIdAndPeriodIndex(
        challengeParticipantId: Long,
        periodIndex: Int
    ): ChallengePeriodSettlement?

    fun findAllByChallengeParticipantId(challengeParticipantId: Long): List<ChallengePeriodSettlement>

    fun findAllByChallengeId(challengeId: Long): List<ChallengePeriodSettlement>

    fun findAllByGroupIdAndUserIdAndDepositStatus(
        groupId: Long,
        userId: Long,
        depositStatus: DepositStatus
    ): List<ChallengePeriodSettlement>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM ChallengePeriodSettlement s WHERE s.id IN :ids")
    fun findAllByIdInWithLock(@Param("ids") ids: Collection<Long>): List<ChallengePeriodSettlement>

    @Query(
        """
        SELECT COALESCE(SUM(s.totalPenaltyAmount), 0)
        FROM ChallengePeriodSettlement s
        WHERE s.userId = :userId AND s.groupId = :groupId
        AND s.status = com.dayuse.domain.challenge.period.PeriodSettlementStatus.CONFIRMED_FAILED
        AND s.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
    """
    )
    fun calculateUnpaidPenaltyAmount(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long
    ): Int

    @Query(
        """
        SELECT COALESCE(SUM(s.totalPenaltyAmount), 0)
        FROM ChallengePeriodSettlement s
        WHERE s.groupId = :groupId
        AND s.status = com.dayuse.domain.challenge.period.PeriodSettlementStatus.CONFIRMED_FAILED
        AND s.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
    """
    )
    fun calculateGroupUnpaidPenaltyAmount(@Param("groupId") groupId: Long): Int

    @Query(
        """
        SELECT s
        FROM ChallengePeriodSettlement s
        WHERE s.userId = :userId
          AND s.groupId = :groupId
          AND s.status = com.dayuse.domain.challenge.period.PeriodSettlementStatus.CONFIRMED_FAILED
          AND s.depositStatus = com.dayuse.domain.dailyrecord.DepositStatus.UNPAID
          AND s.totalPenaltyAmount > 0
        ORDER BY s.startDate ASC
    """
    )
    fun findUnpaidSettlementsForDeposit(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long
    ): List<ChallengePeriodSettlement>
}
