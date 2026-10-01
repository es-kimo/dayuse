package com.dayuse.domain.dailyrecord

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
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
    name = "daily_records",
    indexes = [
        Index(
            name = "idx_daily_record_group_id",
            columnList = "groupId"
        ),
        Index(
            name = "idx_daily_record_challenge_id",
            columnList = "challengeId"
        ),
        Index(
            name = "idx_daily_record_participant_id",
            columnList = "challengeParticipantId"
        ),
        Index(
            name = "idx_daily_record_user_id",
            columnList = "userId"
        ),
        Index(
            name = "idx_daily_record_date",
            columnList = "date"
        )
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_participant_date",
            columnNames = ["challengeParticipantId", "date"]
        )
    ]
)
class DailyRecord(
    id: Long = 0L,

    groupId: Long = 0L,

    challengeId: Long = 0L,

    challengeParticipantId: Long = 0L,

    userId: Long = 0L,

    @Column(nullable = false)
    var date: LocalDate = LocalDate.now(),

    @Enumerated(EnumType.STRING)
    @Column(
        nullable = false,
        length = 20
    )
    var status: DailyRecordStatus = DailyRecordStatus.PLANNED,

    @Column(nullable = false)
    var penaltyAmount: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(
        nullable = false,
        length = 30
    )
    var depositStatus: DepositStatus = DepositStatus.UNPAID,

    var verificationId: Long? = null,

    var failedAt: LocalDateTime? = null,

    @Column(nullable = false)
    var isLate: Boolean = false,

    @Enumerated(EnumType.STRING)
    @Column(
        nullable = false,
        length = 20
    )
    var penaltyStatus: PenaltyStatus = PenaltyStatus.NONE,

    @Column(nullable = false)
    var redayApplied: Boolean = false,

    var redayAppliedAt: LocalDateTime? = null,

    var redayDeadline: LocalDateTime? = null
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var groupId: Long = groupId
        protected set

    @Column(nullable = false)
    var challengeId: Long = challengeId
        protected set

    @Column(nullable = false)
    var challengeParticipantId: Long = challengeParticipantId
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    fun isLocked(): Boolean = depositStatus != DepositStatus.UNPAID

    /**
     * 대상일(date) 기준 고정 리데이 기한(date + 2일 09:00 KST)을 반환합니다. (v0.11 F02)
     */
    fun effectiveRedayDeadline(): LocalDateTime =
        redayDeadline ?: DateTimeUtils.calculateRedayDeadline(date)

    /**
     * 미수행 확정 처리 (v0.11 F04 반영)
     * - 리데이 허용 챌린지이면서 리데이 기한(targetDate + 2일 09:00) 이내이면 벌금을 보류(PENDING) 상태로 둡니다.
     * - 리데이 미허용 챌린지이거나 이미 기한이 만료된 경우 즉시 벌금 확정(CONFIRMED) 상태로 처리합니다.
     */
    fun markFailed(
        penalty: Int,
        today: LocalDate = DateTimeUtils.todayKst(),
        redayAllowed: Boolean = false,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록은 상태를 변경할 수 없습니다.")
        }
        if (currentStatus(today) != DailyRecordStatus.UNCHECKED) {
            throw BadRequestException("미확인 상태의 기록만 미수행으로 확정할 수 있습니다.")
        }
        this.status = DailyRecordStatus.FAILED
        this.penaltyAmount = penalty
        this.failedAt = now
        val deadline = DateTimeUtils.calculateRedayDeadline(date)
        this.redayDeadline = if (redayAllowed && penalty > 0) deadline else null
        this.penaltyStatus = when {
            penalty <= 0 -> PenaltyStatus.NONE
            redayAllowed && now < deadline -> PenaltyStatus.PENDING
            else -> PenaltyStatus.CONFIRMED
        }
    }

    fun validateLateVerification(today: LocalDate = DateTimeUtils.todayKst()) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록은 인증을 등록할 수 없습니다.")
        }
        if (date >= today) {
            throw BadRequestException("오늘 또는 미래 날짜는 늦은 인증 대상이 아닙니다.")
        }
        val effectiveStatus = currentStatus(today)
        if (effectiveStatus != DailyRecordStatus.UNCHECKED && effectiveStatus != DailyRecordStatus.FAILED) {
            throw BadRequestException("미확인 또는 미수행 상태의 기록만 늦은 인증을 등록할 수 있습니다.")
        }
    }

    /**
     * 늦은 인증 또는 지각 인증 등록 처리 (v0.11 F02, F04)
     * - 늦은 인증(익일 09:00 미만, isLate=false): 벌금 없음(0원, NONE), 리데이 불필요
     * - 지각 인증(익일 09:00 이후, isLate=true):
     *   - 리데이 허용 챌린지 + 리데이 기한 내(targetDate + 2일 09:00 미만): 벌금 보류(PENDING) 유지, 리데이 가능
     *   - 리데이 허용 챌린지 + 리데이 기한 만료(targetDate + 2일 09:00 이상): 벌금 확정(CONFIRMED), 리데이 불가
     *   - 기존 하위 호환(redayAllowed=false, penaltyAmountForOverdue=0): 기존 늦은/지각 인증 정책 호환 유지
     */
    fun verifyLate(
        verificationId: Long,
        isLate: Boolean = true,
        today: LocalDate = DateTimeUtils.todayKst(),
        redayAllowed: Boolean = false,
        penaltyAmountForOverdue: Int = 0,
        submittedAt: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        validateLateVerification(today)
        val alreadyConfirmedPenalty = this.penaltyStatus == PenaltyStatus.CONFIRMED && this.penaltyAmount > 0
        this.status = DailyRecordStatus.COMPLETED
        this.verificationId = verificationId
        this.isLate = isLate

        if (!isLate) {
            // 익일 오전 9시 전 늦은 인증: 벌금 없음, 리데이 불필요
            this.penaltyAmount = 0
            this.penaltyStatus = PenaltyStatus.NONE
            this.redayDeadline = null
            return
        }

        val deadline = DateTimeUtils.calculateRedayDeadline(date)
        if (redayAllowed && penaltyAmountForOverdue > 0) {
            this.redayDeadline = deadline
            if (alreadyConfirmedPenalty || submittedAt >= deadline) {
                // 이미 확정된 벌금이거나 리데이 기한(targetDate + 2일 09:00)이 지난 경우 벌금 확정 유지 (소급 보류 금지)
                this.penaltyAmount = penaltyAmountForOverdue
                this.penaltyStatus = PenaltyStatus.CONFIRMED
            } else {
                // 리데이 가능 구간(익일 09:00 <= t < 이틀 뒤 09:00): 벌금 보류 상태 유지
                this.penaltyAmount = penaltyAmountForOverdue
                this.penaltyStatus = PenaltyStatus.PENDING
            }
        } else {
            this.penaltyAmount = penaltyAmountForOverdue
            this.penaltyStatus = if (penaltyAmountForOverdue > 0) PenaltyStatus.CONFIRMED else PenaltyStatus.NONE
            this.redayDeadline = null
        }
    }

    fun verifyToday(verificationId: Long) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록은 인증을 등록할 수 없습니다.")
        }
        this.status = DailyRecordStatus.COMPLETED
        this.verificationId = verificationId
        this.penaltyAmount = 0
        this.isLate = false
        this.penaltyStatus = PenaltyStatus.NONE
        this.redayDeadline = null
    }

    /**
     * 리데이 적용으로 벌금 면제 처리 (v0.11 F04, F06)
     * - 지각 사실(isLate = true)은 유지하고 벌금만 0원 및 EXEMPTED로 전환합니다.
     */
    fun applyReday(appliedAt: LocalDateTime = DateTimeUtils.nowKst()) {
        if (isLocked()) {
            throw BadRequestException("이미 입금 신고 중이거나 정산 완료된 기록에는 리데이를 적용할 수 없습니다.")
        }
        if (this.penaltyStatus == PenaltyStatus.CONFIRMED) {
            throw BadRequestException("이미 확정된 벌금에는 리데이를 적용할 수 없습니다.")
        }
        if (this.redayApplied || this.penaltyStatus == PenaltyStatus.EXEMPTED) {
            return
        }
        this.redayApplied = true
        this.redayAppliedAt = appliedAt
        this.penaltyAmount = 0
        this.penaltyStatus = PenaltyStatus.EXEMPTED
    }

    /**
     * 리데이 기한 만료 시 보류 벌금을 확정 벌금으로 전환합니다. (v0.11 F04)
     */
    fun confirmExpiredPendingPenalty(
        defaultPenaltyAmount: Int = this.penaltyAmount,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Boolean {
        if (isLocked() || this.redayApplied || this.penaltyStatus == PenaltyStatus.EXEMPTED || this.penaltyStatus == PenaltyStatus.CONFIRMED) {
            return false
        }
        val deadline = effectiveRedayDeadline()
        if (now < deadline) {
            return false
        }
        val effectivePenalty = if (this.penaltyAmount > 0) this.penaltyAmount else defaultPenaltyAmount
        if (effectivePenalty <= 0) {
            return false
        }
        this.penaltyAmount = effectivePenalty
        this.penaltyStatus = PenaltyStatus.CONFIRMED
        if (this.status != DailyRecordStatus.COMPLETED && this.status != DailyRecordStatus.FAILED) {
            this.status = DailyRecordStatus.FAILED
            this.failedAt = this.failedAt ?: now
        }
        return true
    }

    /**
     * 현재 시각(now) 기준 동적 벌금 상태를 평가합니다. (v0.11 F04)
     * - 이미 CONFIRMED 또는 EXEMPTED 상태이면 불변성을 유지합니다.
     * - 리데이 허용 챌린지의 미인증/지각 기록은 리데이 기한 전에는 PENDING, 기한 만료 후에는 CONFIRMED로 판정합니다.
     */
    fun evaluatePenaltyStatus(
        redayAllowed: Boolean = false,
        participantPenaltyAmount: Int = this.penaltyAmount,
        challengeAbortedAt: LocalDateTime? = null,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): PenaltyStatus {
        if (challengeAbortedAt != null && date >= challengeAbortedAt.toLocalDate() && depositStatus == DepositStatus.UNPAID) {
            return PenaltyStatus.NONE
        }
        if (redayApplied || penaltyStatus == PenaltyStatus.EXEMPTED) {
            return PenaltyStatus.EXEMPTED
        }
        if (depositStatus != DepositStatus.UNPAID || penaltyStatus == PenaltyStatus.CONFIRMED) {
            return PenaltyStatus.CONFIRMED
        }
        if (penaltyStatus == PenaltyStatus.PENDING) {
            return if (now >= effectiveRedayDeadline()) PenaltyStatus.CONFIRMED else PenaltyStatus.PENDING
        }

        // 기존 레거시 FAILED 레코드 (penaltyStatus == NONE 이지만 status == FAILED && penaltyAmount > 0 인 경우)
        if (status == DailyRecordStatus.FAILED && penaltyAmount > 0) {
            return if (redayAllowed && now < effectiveRedayDeadline()) {
                PenaltyStatus.PENDING
            } else {
                PenaltyStatus.CONFIRMED
            }
        }

        // 리데이 허용 챌린지에서 익일 09:00 이후 미인증(UNCHECKED) 또는 지각 인증(COMPLETED + isLate) 상태인 경우
        if (redayAllowed && participantPenaltyAmount > 0) {
            val phase = DateTimeUtils.evaluateVerificationPhase(date, now)
            if (status == DailyRecordStatus.COMPLETED && isLate) {
                return if (phase == VerificationTimePhase.OVERDUE_EXPIRED) PenaltyStatus.CONFIRMED else PenaltyStatus.PENDING
            }
            if (status != DailyRecordStatus.COMPLETED && phase.isOverdue) {
                return if (phase == VerificationTimePhase.OVERDUE_EXPIRED) PenaltyStatus.CONFIRMED else PenaltyStatus.PENDING
            }
        }

        return PenaltyStatus.NONE
    }

    fun isConfirmedUnpaidPenalty(
        redayAllowed: Boolean = false,
        participantPenaltyAmount: Int = this.penaltyAmount,
        challengeAbortedAt: LocalDateTime? = null,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Boolean {
        if (depositStatus != DepositStatus.UNPAID) return false
        val evalStatus = evaluatePenaltyStatus(redayAllowed, participantPenaltyAmount, challengeAbortedAt, now)
        val effectiveAmount = if (penaltyAmount > 0) penaltyAmount else participantPenaltyAmount
        return evalStatus == PenaltyStatus.CONFIRMED && effectiveAmount > 0
    }

    fun isPendingPenalty(
        redayAllowed: Boolean = false,
        participantPenaltyAmount: Int = this.penaltyAmount,
        challengeAbortedAt: LocalDateTime? = null,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Boolean {
        if (depositStatus != DepositStatus.UNPAID) return false
        val evalStatus = evaluatePenaltyStatus(redayAllowed, participantPenaltyAmount, challengeAbortedAt, now)
        val effectiveAmount = if (penaltyAmount > 0) penaltyAmount else participantPenaltyAmount
        return evalStatus == PenaltyStatus.PENDING && effectiveAmount > 0
    }

    fun completeJointly() {
        if (this.status != DailyRecordStatus.COMPLETED) {
            this.status = DailyRecordStatus.COMPLETED
            this.penaltyAmount = 0
            this.penaltyStatus = PenaltyStatus.NONE
        }
    }

    fun clearJointVerification() {
        this.verificationId = null
        this.isLate = false
    }

    fun rollbackVerification(today: LocalDate = DateTimeUtils.todayKst()) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록의 인증은 삭제할 수 없습니다.")
        }
        if (this.redayApplied || this.penaltyStatus == PenaltyStatus.EXEMPTED) {
            throw BadRequestException("리데이가 적용된 인증 기록은 삭제할 수 없습니다.")
        }
        if (this.penaltyStatus == PenaltyStatus.CONFIRMED && this.penaltyAmount > 0) {
            throw BadRequestException("이미 벌금이 확정된 기록의 인증은 삭제할 수 없습니다.")
        }
        this.verificationId = null
        this.isLate = false
        this.penaltyAmount = 0
        this.penaltyStatus = PenaltyStatus.NONE
        this.redayDeadline = null
        this.status = if (date == today) DailyRecordStatus.WAITING else DailyRecordStatus.UNCHECKED
    }

    fun currentStatus(today: LocalDate = DateTimeUtils.todayKst()): DailyRecordStatus {
        return when {
            status == DailyRecordStatus.COMPLETED -> DailyRecordStatus.COMPLETED
            status == DailyRecordStatus.FAILED -> DailyRecordStatus.FAILED
            date > today -> DailyRecordStatus.PLANNED
            date == today -> DailyRecordStatus.WAITING
            else -> DailyRecordStatus.UNCHECKED
        }
    }
}
