package com.dayuse.domain.challenge

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.LocalDate

@Entity
@Table(
    name = "challenges",
    indexes = [
        Index(name = "idx_challenge_group_id", columnList = "groupId")
    ]
)
class Challenge(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(nullable = false)
    val groupId: Long = 0L,

    @Column(nullable = false)
    val creatorUserId: Long = 0L,

    @Column(nullable = false, length = 50)
    var title: String = "",

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(nullable = false, columnDefinition = "TEXT")
    var verificationCriteria: String = "",

    @Column(nullable = false)
    var startDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    var endDate: LocalDate = LocalDate.now().plusDays(13)
) : BaseTimeEntity() {

    fun isStarted(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return today >= startDate
    }

    fun isEnded(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return today > endDate
    }

    fun status(today: LocalDate = DateTimeUtils.todayKst()): ChallengeStatus {
        return when {
            !isStarted(today) -> ChallengeStatus.NOT_STARTED
            !isEnded(today) -> ChallengeStatus.IN_PROGRESS
            else -> ChallengeStatus.ENDED
        }
    }

    fun canJoin(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    fun canCancel(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    fun canDelete(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    fun canModifyFullConditions(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    fun updateConditions(
        newTitle: String?,
        newDescription: String?,
        newVerificationCriteria: String?,
        newStartDate: LocalDate?,
        newEndDate: LocalDate?,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        if (isStarted(today)) {
            val criteriaChanged = newVerificationCriteria != null && newVerificationCriteria != this.verificationCriteria
            val startDateChanged = newStartDate != null && newStartDate != this.startDate
            val endDateChanged = newEndDate != null && newEndDate != this.endDate

            if (criteriaChanged || startDateChanged || endDateChanged) {
                throw BadRequestException("챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다.")
            }
        } else {
            if (newStartDate != null) {
                if (newStartDate < today) {
                    throw BadRequestException("시작일은 오늘 이후 날짜여야 합니다.")
                }
                this.startDate = newStartDate
            }
            if (newEndDate != null) {
                if (newEndDate < this.startDate) {
                    throw BadRequestException("종료일은 시작일 이후여야 합니다.")
                }
                this.endDate = newEndDate
            } else if (newStartDate != null && this.endDate < this.startDate) {
                this.endDate = this.startDate.plusDays(13)
            }
            if (newVerificationCriteria != null) {
                if (newVerificationCriteria.isBlank()) {
                    throw BadRequestException("인증 기준은 필수 항목입니다.")
                }
                this.verificationCriteria = newVerificationCriteria
            }
        }

        if (newTitle != null) {
            if (newTitle.isBlank() || newTitle.length > 50) {
                throw BadRequestException("제목은 1자 이상 50자 이하여야 합니다.")
            }
            this.title = newTitle
        }
        if (newDescription != null) {
            this.description = newDescription
        }
    }
}
