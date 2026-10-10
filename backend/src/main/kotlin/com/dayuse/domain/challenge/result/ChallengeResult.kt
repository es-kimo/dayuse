package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
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
    name = "challenge_results",
    indexes = [
        Index(name = "idx_challenge_result_challenge_id", columnList = "challengeId"),
        Index(name = "idx_challenge_result_group_id", columnList = "groupId"),
        Index(name = "idx_challenge_result_status", columnList = "status")
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_challenge_result_challenge_id", columnNames = ["challengeId"])
    ]
)
class ChallengeResult(
    id: Long = 0L,

    @Column(nullable = false)
    val challengeId: Long = 0L,

    @Column(nullable = false)
    val groupId: Long = 0L,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var status: ChallengeResultStatus = ChallengeResultStatus.PROVISIONAL,

    @Column(nullable = false, length = 20)
    var policyVersion: String = "v1",

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val executionType: ExecutionType = ExecutionType.INDIVIDUAL,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    val periodType: PeriodType = PeriodType.DAILY,

    @Column(nullable = false)
    val startDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    val endDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    var totalTargetCount: Int = 0,

    @Column(nullable = false)
    var totalCompletedCount: Int = 0,

    @Column(nullable = true)
    var achievementRate: Double? = null,

    @Column(nullable = false)
    var isSuccess: Boolean = false,

    @Column(nullable = true)
    var abortedAt: LocalDateTime? = null,

    @Column(columnDefinition = "TEXT")
    var abortReason: String? = null,

    @Column(nullable = true)
    var provisionalAt: LocalDateTime? = null,

    @Column(nullable = true)
    var confirmedAt: LocalDateTime? = null
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    fun updateMetrics(
        status: ChallengeResultStatus,
        totalTargetCount: Int,
        totalCompletedCount: Int,
        achievementRate: Double?,
        isSuccess: Boolean,
        now: LocalDateTime
    ) {
        this.status = status
        this.totalTargetCount = totalTargetCount
        this.totalCompletedCount = totalCompletedCount
        this.achievementRate = achievementRate
        this.isSuccess = isSuccess
        when (status) {
            ChallengeResultStatus.PROVISIONAL -> {
                if (this.provisionalAt == null) {
                    this.provisionalAt = now
                }
            }
            ChallengeResultStatus.CONFIRMED -> {
                if (this.confirmedAt == null) {
                    this.confirmedAt = now
                }
            }
            ChallengeResultStatus.ABORTED -> {
                if (this.confirmedAt == null) {
                    this.confirmedAt = now
                }
            }
        }
    }
}
