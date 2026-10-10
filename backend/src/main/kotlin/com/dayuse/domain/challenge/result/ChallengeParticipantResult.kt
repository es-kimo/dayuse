package com.dayuse.domain.challenge.result

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate

@Entity
@Table(
    name = "challenge_participant_results",
    indexes = [
        Index(name = "idx_part_result_challenge_id", columnList = "challengeId"),
        Index(name = "idx_part_result_challenge_result_id", columnList = "challengeResultId"),
        Index(name = "idx_part_result_user_id", columnList = "userId"),
        Index(name = "idx_part_result_participant_id", columnList = "challengeParticipantId")
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_part_result_challenge_user",
            columnNames = ["challengeId", "userId"]
        )
    ]
)
class ChallengeParticipantResult(
    id: Long = 0L,

    @Column(nullable = false)
    val challengeResultId: Long = 0L,

    @Column(nullable = false)
    val challengeId: Long = 0L,

    @Column(nullable = false)
    val challengeParticipantId: Long = 0L,

    @Column(nullable = false)
    val userId: Long = 0L,

    @Column(nullable = false)
    val groupId: Long = 0L,

    @Column(nullable = false)
    val participantStartDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    var targetCount: Int = 0,

    @Column(nullable = false)
    var completedCount: Int = 0,

    @Column(nullable = false)
    var contributionCount: Int = 0,

    @Column(nullable = false)
    var actualSubmissionCount: Int = 0,

    @Column(nullable = true)
    var achievementRate: Double? = null,

    @Column(nullable = false)
    var isSuccess: Boolean = false
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    fun updateMetrics(
        targetCount: Int,
        completedCount: Int,
        contributionCount: Int,
        actualSubmissionCount: Int,
        achievementRate: Double?,
        isSuccess: Boolean
    ) {
        this.targetCount = targetCount
        this.completedCount = completedCount
        this.contributionCount = contributionCount
        this.actualSubmissionCount = actualSubmissionCount
        this.achievementRate = achievementRate
        this.isSuccess = isSuccess
    }
}
