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
        Index(name = "idx_daily_record_group_id", columnList = "groupId"),
        Index(name = "idx_daily_record_challenge_id", columnList = "challengeId"),
        Index(name = "idx_daily_record_participant_id", columnList = "challengeParticipantId"),
        Index(name = "idx_daily_record_user_id", columnList = "userId"),
        Index(name = "idx_daily_record_date", columnList = "date")
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
    @Column(nullable = false, length = 20)
    var status: DailyRecordStatus = DailyRecordStatus.PLANNED,

    @Column(nullable = false)
    var penaltyAmount: Int = 0,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    var depositStatus: DepositStatus = DepositStatus.UNPAID,

    var verificationId: Long? = null,

    var failedAt: LocalDateTime? = null,

    @Column(nullable = false)
    var isLate: Boolean = false
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

    fun markFailed(penalty: Int) {
        // TODO [사용자 미션 1-1]: 미확인 기록에 대한 '미수행(FAILED)' 확정 및 약정 벌금 부과 로직을 직접 구현하세요.
        // 1. 정산 락(isLocked() == true) 여부를 확인하고, 잠겨 있다면 BadRequestException("정산 진행 중이거나 완료된 기록은 상태를 변경할 수 없습니다.")을 던집니다.
        // 2. 현재 상태가 DailyRecordStatus.UNCHECKED가 아니라면 BadRequestException("미확인 상태의 기록만 미수행으로 확정할 수 있습니다.")을 던집니다.
        // 3. 상태(status)를 FAILED로 변경하고, penaltyAmount에 전달받은 penalty를 설정하며, failedAt에 현재 시각(LocalDateTime.now())을 기록합니다.
        throw NotImplementedError("미션 1-1: markFailed 로직을 직접 구현해보세요.")
    }

    fun verifyLate(verificationId: Long) {
        // TODO [사용자 미션 1-2]: 지난 날짜의 '늦은 인증(COMPLETED, isLate=true)' 등록 및 벌금 차감 복구 로직을 직접 구현하세요.
        // 1. 정산 락(isLocked() == true) 여부를 확인하고, 잠겨 있다면 BadRequestException("정산 진행 중이거나 완료된 기록은 인증을 등록할 수 없습니다.")을 던집니다.
        // 2. 현재 상태가 UNCHECKED 또는 FAILED가 아니라면 BadRequestException("미확인 또는 미수행 상태의 기록만 늦은 인증을 등록할 수 있습니다.")을 던집니다.
        // 3. 상태(status)를 COMPLETED로 변경하고, verificationId를 연결하며, penaltyAmount를 0원으로 초기화하고, isLate를 true로 설정합니다.
        throw NotImplementedError("미션 1-2: verifyLate 로직을 직접 구현해보세요.")
    }

    fun verifyToday(verificationId: Long) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록은 인증을 등록할 수 없습니다.")
        }
        this.status = DailyRecordStatus.COMPLETED
        this.verificationId = verificationId
        this.penaltyAmount = 0
        this.isLate = false
    }

    fun rollbackVerification(today: LocalDate = DateTimeUtils.todayKst()) {
        if (isLocked()) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록의 인증은 삭제할 수 없습니다.")
        }
        this.verificationId = null
        this.isLate = false
        this.penaltyAmount = 0
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
