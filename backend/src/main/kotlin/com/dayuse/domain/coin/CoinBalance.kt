package com.dayuse.domain.coin

import com.dayuse.global.exception.BadRequestException
import jakarta.persistence.*
import java.time.LocalDateTime

/**
 * 사용자별 코인 잔액 스냅샷 엔티티 (PRD 5.4)
 * - M_end = M_start + I - S - R 공식의 최종 잔액 스냅샷
 * - heldBalance: 이상 징후/비상 킬스위치 시 격리된 보류 코인 (사용 가능 잔액에 미포함)
 */
@Entity
@Table(
    name = "coin_balances",
    indexes = [
        Index(name = "idx_coin_balances_user_id", columnList = "user_id", unique = true)
    ]
)
class CoinBalance(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "user_id", nullable = false, unique = true)
    val userId: Long,

    @Column(name = "available_balance", nullable = false)
    var availableBalance: Int = 0,

    @Column(name = "held_balance", nullable = false)
    var heldBalance: Int = 0,

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    fun addAvailable(amount: Int, now: LocalDateTime = LocalDateTime.now()) {
        require(amount >= 0) { "지급 금액은 0 이상이어야 합니다." }
        this.availableBalance += amount
        this.updatedAt = now
    }

    fun subtractAvailable(amount: Int, now: LocalDateTime = LocalDateTime.now()) {
        require(amount >= 0) { "차감 금액은 0 이상이어야 합니다." }
        if (this.availableBalance < amount) {
            throw BadRequestException("잔액이 부족합니다. (현재: $availableBalance, 요청: $amount)")
        }
        this.availableBalance -= amount
        this.updatedAt = now
    }

    fun addHeld(amount: Int, now: LocalDateTime = LocalDateTime.now()) {
        require(amount >= 0) { "보류 금액은 0 이상이어야 합니다." }
        this.heldBalance += amount
        this.updatedAt = now
    }

    fun releaseHeld(amount: Int, now: LocalDateTime = LocalDateTime.now()) {
        require(amount >= 0) { "해제 금액은 0 이상이어야 합니다." }
        if (this.heldBalance < amount) {
            throw BadRequestException("보류 잔액이 부족합니다. (현재: $heldBalance, 요청: $amount)")
        }
        this.heldBalance -= amount
        this.availableBalance += amount
        this.updatedAt = now
    }

    fun rejectHeld(amount: Int, now: LocalDateTime = LocalDateTime.now()) {
        require(amount >= 0) { "반려 금액은 0 이상이어야 합니다." }
        if (this.heldBalance < amount) {
            throw BadRequestException("보류 잔액이 부족합니다. (현재: $heldBalance, 요청: $amount)")
        }
        this.heldBalance -= amount
        this.updatedAt = now
    }
}
