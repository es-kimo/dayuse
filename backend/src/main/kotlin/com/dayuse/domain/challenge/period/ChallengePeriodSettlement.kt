package com.dayuse.domain.challenge.period

import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(
    name = "challenge_period_settlements",
    indexes = [
        Index(name = "idx_period_settlement_challenge_id", columnList = "challengeId"),
        Index(name = "idx_period_settlement_participant_id", columnList = "challengeParticipantId"),
        Index(name = "idx_period_settlement_user_id", columnList = "userId"),
        Index(name = "idx_period_settlement_group_id", columnList = "groupId"),
        Index(name = "idx_period_settlement_status", columnList = "status")
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_participant_period_index",
            columnNames = ["challengeParticipantId", "periodIndex"]
        )
    ]
)
class ChallengePeriodSettlement(
    id: Long = 0L,

    @Column(nullable = false)
    val challengeId: Long = 0L,

    @Column(nullable = false)
    val challengeParticipantId: Long = 0L,

    @Column(nullable = false)
    val userId: Long = 0L,

    @Column(nullable = false)
    val groupId: Long = 0L,

    @Column(nullable = false)
    val periodIndex: Int = 1,

    @Column(nullable = false)
    val startDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    val endDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    val targetCount: Int = 0,

    @Column(nullable = false)
    var completedCount: Int = 0,

    @Column(nullable = false)
    var missedCount: Int = 0,

    @Column(nullable = false)
    var penaltyAmountPerMiss: Int = 0,

    @Column(nullable = false)
    var totalPenaltyAmount: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var status: PeriodSettlementStatus = PeriodSettlementStatus.IN_PROGRESS,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var depositStatus: DepositStatus = DepositStatus.UNPAID,

    var confirmedAt: LocalDateTime? = null
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    fun confirmFailed(penaltyPerMiss: Int, now: LocalDateTime = LocalDateTime.now()) {
        this.missedCount = maxOf(0, targetCount - completedCount)
        this.penaltyAmountPerMiss = penaltyPerMiss
        this.totalPenaltyAmount = this.missedCount * penaltyPerMiss
        this.status = PeriodSettlementStatus.CONFIRMED_FAILED
        this.depositStatus = DepositStatus.UNPAID
        this.confirmedAt = now
    }
}
