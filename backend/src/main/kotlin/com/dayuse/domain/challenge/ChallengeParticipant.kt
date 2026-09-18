package com.dayuse.domain.challenge

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

@Entity
@Table(
    name = "challenge_participants",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_challenge_user",
            columnNames = ["challengeId", "userId"]
        )
    ]
)
class ChallengeParticipant(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(nullable = false)
    val challengeId: Long = 0L,

    @Column(nullable = false)
    val userId: Long = 0L,

    @Column(nullable = false)
    var penaltyAmount: Int = 5000,

    @Column(nullable = false)
    val joinedAt: LocalDateTime = LocalDateTime.now()
) : BaseTimeEntity()
