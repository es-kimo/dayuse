package com.dayuse.domain.coin

import jakarta.persistence.*
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 코인 거래 유형 (PRD 5.4, F06, F07, F11)
 */
enum class CoinTransactionType(val description: String) {
    GRANT("자동 지급"),
    ADJUSTMENT_ADD("보정 증액"),
    ADJUSTMENT_SUB("보정 차감"),
    HOLD("위험 보류"),
    RELEASE("보류 해제"),
    REJECT("보류 반려")
}

/**
 * 코인 거래 상태
 */
enum class CoinTransactionStatus {
    COMPLETED,
    HELD,
    REJECTED
}

/**
 * 코인 불변 거래 원장 엔티티 (PRD 5.4, F06, F07)
 * - 이미 작성된 원장 행은 수정/삭제되지 않는 불변(Append-Only) 기록
 * - 멱등키(idempotencyKey) 유니크 제약조건으로 중복 지급/처리 원천 차단
 */
@Entity
@Table(
    name = "coin_transactions",
    indexes = [
        Index(name = "idx_coin_transactions_idempotency_key", columnList = "idempotency_key", unique = true),
        Index(name = "idx_coin_transactions_user_id", columnList = "user_id"),
        Index(name = "idx_coin_transactions_status", columnList = "status")
    ]
)
class CoinTransaction(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 30)
    val type: CoinTransactionType,

    @Column(name = "amount", nullable = false)
    val amount: Int,

    @Column(name = "balance_after", nullable = false)
    val balanceAfter: Int,

    @Column(name = "held_balance_after", nullable = false)
    val heldBalanceAfter: Int,

    @Column(name = "target_date", nullable = false)
    val targetDate: LocalDate,

    @Column(name = "challenge_id")
    val challengeId: Long? = null,

    @Column(name = "verification_id")
    val verificationId: Long? = null,

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    val idempotencyKey: String,

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    var status: CoinTransactionStatus = CoinTransactionStatus.COMPLETED,

    @Column(name = "reason", length = 255)
    var reason: String? = null,

    @Column(name = "reviewed_by")
    var reviewedBy: Long? = null,

    @Column(name = "reviewed_at")
    var reviewedAt: LocalDateTime? = null,

    @Column(name = "created_at", nullable = false)
    val createdAt: LocalDateTime = LocalDateTime.now()
) {
    fun markReleased(adminUserId: Long, now: LocalDateTime) {
        this.status = CoinTransactionStatus.COMPLETED
        this.reviewedBy = adminUserId
        this.reviewedAt = now
    }

    fun markRejected(adminUserId: Long, rejectionReason: String?, now: LocalDateTime) {
        this.status = CoinTransactionStatus.REJECTED
        this.reviewedBy = adminUserId
        this.reviewedAt = now
        if (rejectionReason != null) {
            this.reason = rejectionReason
        }
    }
}
