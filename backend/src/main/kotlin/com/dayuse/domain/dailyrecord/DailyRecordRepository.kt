package com.dayuse.domain.dailyrecord

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate

interface DailyRecordRepository : JpaRepository<DailyRecord, Long> {

    fun findByChallengeParticipantIdAndDate(challengeParticipantId: Long, date: LocalDate): DailyRecord?

    fun findByChallengeIdAndUserIdAndDate(challengeId: Long, userId: Long, date: LocalDate): DailyRecord?

    fun findAllByChallengeParticipantId(challengeParticipantId: Long): List<DailyRecord>

    fun findAllByChallengeId(challengeId: Long): List<DailyRecord>

    fun findAllByChallengeIdAndDate(challengeId: Long, date: LocalDate): List<DailyRecord>

    fun findAllByGroupIdAndUserId(groupId: Long, userId: Long): List<DailyRecord>

    fun findAllByVerificationId(verificationId: Long): List<DailyRecord>

    // TODO [사용자 미션 2]: 사용자별/모임별 미수행(FAILED) 상태이면서 미정산(UNPAID)인 약정 벌금 합계(SUM) 집계 쿼리를 JPQL로 직접 작성하세요.
    // 💡 힌트:
    // - status가 DailyRecordStatus.FAILED이고 depositStatus가 DepositStatus.UNPAID인 레코드의 penaltyAmount를 합산합니다.
    // - 결과가 0건일 때 null이 반환되어 예외가 발생하지 않도록 COALESCE(SUM(r.penaltyAmount), 0)을 사용하세요.
    @Query("""
        SELECT 0
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
    """)
    fun calculateUnpaidPenaltyAmount(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long
    ): Int

    @Query("""
        SELECT COUNT(r)
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.UNCHECKED
               OR (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.WAITING AND r.date < :today))
    """)
    fun countUncheckedRecords(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long,
        @Param("today") today: LocalDate
    ): Long

    @Query("""
        SELECT r
        FROM DailyRecord r
        WHERE r.userId = :userId
          AND r.groupId = :groupId
          AND (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.UNCHECKED
               OR (r.status = com.dayuse.domain.dailyrecord.DailyRecordStatus.WAITING AND r.date < :today))
        ORDER BY r.date ASC
    """)
    fun findUncheckedRecords(
        @Param("userId") userId: Long,
        @Param("groupId") groupId: Long,
        @Param("today") today: LocalDate
    ): List<DailyRecord>
}
