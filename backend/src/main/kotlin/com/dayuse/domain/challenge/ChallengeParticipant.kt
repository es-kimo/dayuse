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
    id: Long = 0L,

    challengeId: Long = 0L,

    userId: Long = 0L,

    @Column(nullable = false)
    var penaltyAmount: Int = 5000,

    joinedAt: LocalDateTime = LocalDateTime.now()
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    // Spring Data 파생 쿼리와 JPA 필드 접근에서 사용합니다.
    @Suppress("unused")
    @Column(nullable = false)
    var challengeId: Long = challengeId
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    @Column(nullable = false)
    var joinedAt: LocalDateTime = joinedAt
        protected set
}
