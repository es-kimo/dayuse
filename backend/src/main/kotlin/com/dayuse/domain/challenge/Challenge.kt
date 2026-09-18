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

    // TODO [사용자 미션 1-1]: 챌린지 시작 여부를 판별하는 도메인 메서드를 작성하세요.
    // - 한국 시간(KST) 기준 오늘 날짜(today)가 시작일(startDate)과 같거나 이후이면 시작된 것으로 판별합니다.
    fun isStarted(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        // TODO: 오늘 날짜가 시작일 이상인지 검사하여 반환하세요.
        return false
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

    // TODO [사용자 미션 1-2]: 챌린지 참여 가능 여부를 반환하는 도메인 메서드를 작성하세요.
    // - 챌린지가 아직 시작되지 않은 상태(!isStarted)여야만 참여할 수 있습니다.
    fun canJoin(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        // TODO: 시작 전인지 확인하는 로직을 작성하세요.
        return false
    }

    fun canCancel(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    fun canDelete(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        return !isStarted(today)
    }

    // TODO [사용자 미션 1-3]: 챌린지 조건 전체 수정 가능 여부를 반환하는 도메인 메서드를 작성하세요.
    // - 챌린지가 아직 시작되지 않은 상태여야만 기간, 인증 기준 등 전체 조건을 수정할 수 있습니다.
    fun canModifyFullConditions(today: LocalDate = DateTimeUtils.todayKst()): Boolean {
        // TODO: 시작 전인지 확인하는 로직을 작성하세요.
        return false
    }

    // TODO [사용자 미션 1-4]: 챌린지 조건 수정 정책 메서드를 완성하세요.
    // 1) 시작된 챌린지(isStarted(today) == true)인 경우:
    //    - verificationCriteria, startDate, endDate가 기존 값과 다르게 변경 요청되었다면
    //      throw BadRequestException("챌린지 시작 후에는 제목과 설명만 수정할 수 있습니다.")
    // 2) 시작 전 챌린지인 경우:
    //    - newStartDate가 오늘보다 이전이면 throw BadRequestException("시작일은 오늘 이후 날짜여야 합니다.")
    //    - newEndDate가 시작일보다 이전이면 throw BadRequestException("종료일은 시작일 이후여야 합니다.")
    //    - newVerificationCriteria가 null이 아니면서 blank면 throw BadRequestException("인증 기준은 필수 항목입니다.")
    // 3) 공통 (제목, 설명):
    //    - newTitle이 null이 아닐 때 blank이거나 50자 초과 시 throw BadRequestException("제목은 1자 이상 50자 이하여야 합니다.")
    fun updateConditions(
        newTitle: String?,
        newDescription: String?,
        newVerificationCriteria: String?,
        newStartDate: LocalDate?,
        newEndDate: LocalDate?,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        // TODO: 위 요구사항에 맞게 시작 전/시작 후 정책 분기 및 검증 로직을 완성하세요.
    }
}
