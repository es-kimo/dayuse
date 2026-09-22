package com.dayuse.domain.challenge

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ChallengeAlreadyStartedException
import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate
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

    @Column(nullable = false)
    var startDate: LocalDate = LocalDate.now(),

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: ParticipantStatus = ParticipantStatus.ACTIVE,

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

    fun isStarted(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return today >= startDate
    }

    fun canCancel(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today) && status == ParticipantStatus.ACTIVE
    }

    fun canModifyPenalty(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today) && status == ParticipantStatus.ACTIVE
    }

    fun cancel(today: LocalDate = DateTimeUtils.todayKst()) {
        if (!canCancel(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 참여는 취소할 수 없습니다.")
        }
        this.status = ParticipantStatus.CANCELLED
    }

    fun updatePenalty(newAmount: Int, today: LocalDate = DateTimeUtils.todayKst()) {
        if (!canModifyPenalty(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 참여는 약정 금액을 변경할 수 없습니다.")
        }
        if (newAmount < 0) {
            throw BadRequestException("약정 벌금은 0원 이상이어야 합니다.")
        }
        this.penaltyAmount = newAmount
    }

    fun reactivate(newStartDate: LocalDate, newPenalty: Int) {
        if (newPenalty < 0) {
            throw BadRequestException("약정 벌금은 0원 이상이어야 합니다.")
        }
        this.startDate = newStartDate
        this.penaltyAmount = newPenalty
        this.status = ParticipantStatus.ACTIVE
        this.joinedAt = LocalDateTime.now()
    }
}
