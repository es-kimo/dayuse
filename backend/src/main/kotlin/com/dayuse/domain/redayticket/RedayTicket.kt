package com.dayuse.domain.redayticket

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.BadRequestException
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
import java.time.LocalDateTime

/**
 * 리데이 티켓 상태
 */
enum class RedayTicketStatus {
    AVAILABLE,
    USED
}

/**
 * 리데이 티켓 발급 출처
 */
enum class RedayTicketSource {
    REWARD_AD,
    ADMIN_GRANT,
    WELCOME_BONUS
}

/**
 * 리데이 티켓 엔티티 (v0.11 F05)
 *
 * - 계정에 귀속되며 양도 불가
 * - 티켓 자체의 만료일은 없음 (대상 인증 기록의 리데이 기한 내에 사용해야 함)
 * - 발급 원인과 사용된 대상 인증 기록을 추적 가능
 * - UNIQUE 제약(usedDailyRecordId)으로 동일 기록에 중복 적용 DB 레벨 방어
 */
@Entity
@Table(
    name = "reday_tickets",
    indexes = [
        Index(name = "idx_reday_ticket_user_id", columnList = "userId"),
        Index(name = "idx_reday_ticket_status", columnList = "status"),
        Index(name = "idx_reday_ticket_used_record", columnList = "usedDailyRecordId")
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_reday_ticket_used_record",
            columnNames = ["usedDailyRecordId"]
        )
    ]
)
class RedayTicket(
    id: Long = 0L,

    userId: Long = 0L,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var status: RedayTicketStatus = RedayTicketStatus.AVAILABLE,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    var source: RedayTicketSource = RedayTicketSource.REWARD_AD,

    @Column(length = 200)
    var sourceReference: String? = null,

    var usedDailyRecordId: Long? = null,

    var usedAt: LocalDateTime? = null
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var userId: Long = userId
        protected set

    val isAvailable: Boolean
        get() = status == RedayTicketStatus.AVAILABLE

    /**
     * 티켓 사용 처리.
     * - 이미 사용된 티켓에 대한 재사용 시도를 차단합니다.
     * - 멱등성: 동일한 dailyRecordId에 대한 재시도는 추가 소비 없이 반환합니다.
     */
    fun use(dailyRecordId: Long, appliedAt: LocalDateTime) {
        // 멱등성: 같은 기록에 이미 사용된 경우 조용히 반환
        if (status == RedayTicketStatus.USED && usedDailyRecordId == dailyRecordId) {
            return
        }
        if (status == RedayTicketStatus.USED) {
            throw BadRequestException("이미 사용된 리데이 티켓입니다.")
        }
        this.status = RedayTicketStatus.USED
        this.usedDailyRecordId = dailyRecordId
        this.usedAt = appliedAt
    }
}
