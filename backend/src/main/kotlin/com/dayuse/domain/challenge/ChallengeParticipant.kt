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
        // TODO [사용자 미션 1-1]: 참여자의 수행 시작일(startDate)과 기준일(today)을 비교하여 시작 여부를 반환하세요.
        return false
    }

    fun canCancel(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        // TODO [사용자 미션 1-2]: 본인의 수행이 시작되기 전이면서 참여 상태가 ACTIVE인 경우에만 취소 가능하도록 구현하세요.
        return false
    }

    fun canModifyPenalty(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        // TODO [사용자 미션 1-3]: 본인의 수행이 시작되기 전이면서 참여 상태가 ACTIVE인 경우에만 약정 금액 수정이 가능하도록 구현하세요.
        return false
    }

    fun cancel(today: LocalDate = DateTimeUtils.todayKst()) {
        // TODO [사용자 미션 1-4]: canCancel 검증을 통과하지 못하면 ChallengeAlreadyStartedException을 던지고, 상태를 CANCELLED로 전이하세요.
    }

    fun updatePenalty(newAmount: Int, today: LocalDate = DateTimeUtils.todayKst()) {
        // TODO [사용자 미션 1-5]: canModifyPenalty 검증 및 0원 이상 검증(BadRequestException) 후 penaltyAmount를 수정하세요.
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
