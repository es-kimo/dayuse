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
        Index(
            name = "idx_challenge_group_id",
            columnList = "groupId"
        )
    ]
)
class Challenge(
    id: Long = 0L,

    groupId: Long = 0L,

    creatorUserId: Long = 0L,

    @Column(
        nullable = false,
        length = 50
    )
    var title: String = "",

    @Column(columnDefinition = "TEXT")
    var description: String? = null,

    @Column(
        nullable = false,
        columnDefinition = "TEXT"
    )
    var verificationCriteria: String = "",

    @Column(nullable = false)
    var startDate: LocalDate = LocalDate.now(),

    @Column(nullable = false)
    var endDate: LocalDate = LocalDate.now().plusDays(13)
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var groupId: Long = groupId
        protected set

    @Column(nullable = false)
    var creatorUserId: Long = creatorUserId
        protected set


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
        return !isEnded(today)
    }

    fun calculateStartDate(
        startDateType: com.dayuse.domain.challenge.dto.StartDateType?,
        today: LocalDate = DateTimeUtils.todayKst()
    ): LocalDate {
        // TODO [사용자 미션 2]: 챌린지 상태와 startDateType에 따라 실제 수행 시작일을 산출하세요.
        // 1. 이미 종료된 경우(isEnded) BadRequestException을 던지세요.
        // 2. 아직 시작 전인 경우(!isStarted) 챌린지의 startDate를 그대로 반환하세요.
        // 3. 진행 중인 경우 startDateType(기본값 TOMORROW)에 따라 시작일을 계산하세요:
        //    - TODAY: today
        //    - TOMORROW: today.plusDays(1) (단, 종료 당일이면 오늘부터만 가능하므로 BadRequestException)
        // 4. 계산된 시작일이 챌린지 종료일(endDate)을 초과하면 BadRequestException을 던지세요.
        return this.startDate
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
        // 1. 변경 후 값 계산: 아직 객체는 변경하지 않음
        val nextTitle = newTitle ?: this.title
        val nextDescription = newDescription ?: this.description
        val nextCriteria = newVerificationCriteria ?: this.verificationCriteria
        val nextStartDate = newStartDate ?: this.startDate
        val nextEndDate = newEndDate ?: this.endDate

        // 2. 전체 검증
        if (isStarted(today)) {
            val conditionsChanged =
                nextCriteria != this.verificationCriteria ||
                        nextStartDate != this.startDate ||
                        nextEndDate != this.endDate

            if (conditionsChanged) {
                throw BadRequestException("챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다.")
            }
        } else {
            if (newStartDate != null && nextStartDate < today) {
                throw BadRequestException("시작일은 오늘 이후 날짜여야 합니다.")
            }

            if (nextEndDate < nextStartDate) {
                throw BadRequestException("종료일은 시작일 이후여야 합니다.")
            }

            if (newVerificationCriteria != null && nextCriteria.isBlank()) {
                throw BadRequestException("인증 기준은 필수 항목입니다.")
            }
        }

        if (newTitle != null && (nextTitle.isBlank() || nextTitle.length > 50)) {
            throw BadRequestException("제목은 1자 이상 50자 이하여야 합니다.")
        }

        // 3. 검증을 모두 통과한 뒤 반영
        this.title = nextTitle
        this.description = nextDescription
        this.verificationCriteria = nextCriteria
        this.startDate = nextStartDate
        this.endDate = nextEndDate
    }
}
