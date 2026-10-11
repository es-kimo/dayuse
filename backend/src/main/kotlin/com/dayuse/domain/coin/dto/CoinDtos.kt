package com.dayuse.domain.coin.dto

import com.dayuse.domain.coin.CoinBalance
import com.dayuse.domain.coin.CoinTransaction
import com.dayuse.domain.coin.CoinTransactionStatus
import com.dayuse.domain.coin.CoinTransactionType
import jakarta.validation.constraints.NotNull
import java.time.LocalDate
import java.time.LocalDateTime

data class CoinBalanceResponse(
    val userId: Long,
    val availableBalance: Int,
    val heldBalance: Int,
    val totalBalance: Int,
    val updatedAt: LocalDateTime
) {
    companion object {
        fun from(balance: CoinBalance): CoinBalanceResponse = CoinBalanceResponse(
            userId = balance.userId,
            availableBalance = balance.availableBalance,
            heldBalance = balance.heldBalance,
            totalBalance = balance.availableBalance + balance.heldBalance,
            updatedAt = balance.updatedAt
        )

        fun empty(userId: Long, now: LocalDateTime = LocalDateTime.now()): CoinBalanceResponse = CoinBalanceResponse(
            userId = userId,
            availableBalance = 0,
            heldBalance = 0,
            totalBalance = 0,
            updatedAt = now
        )
    }
}

data class CoinTransactionResponse(
    val id: Long,
    val userId: Long,
    val type: CoinTransactionType,
    val amount: Int,
    val balanceAfter: Int,
    val heldBalanceAfter: Int,
    val targetDate: LocalDate,
    val challengeId: Long?,
    val verificationId: Long?,
    val idempotencyKey: String,
    val status: CoinTransactionStatus,
    val reason: String?,
    val createdAt: LocalDateTime
) {
    companion object {
        fun from(tx: CoinTransaction): CoinTransactionResponse = CoinTransactionResponse(
            id = tx.id,
            userId = tx.userId,
            type = tx.type,
            amount = tx.amount,
            balanceAfter = tx.balanceAfter,
            heldBalanceAfter = tx.heldBalanceAfter,
            targetDate = tx.targetDate,
            challengeId = tx.challengeId,
            verificationId = tx.verificationId,
            idempotencyKey = tx.idempotencyKey,
            status = tx.status,
            reason = tx.reason,
            createdAt = tx.createdAt
        )
    }
}

data class AdjustCoinRequest(
    @field:NotNull
    val targetDate: LocalDate,
    @field:NotNull
    val adjustmentAmount: Int,
    val challengeId: Long? = null,
    val reason: String? = null
)

data class RejectHeldTransactionRequest(
    val reason: String? = null
)

data class KillSwitchRequest(
    val active: Boolean,
    val reason: String? = null
)

data class KillSwitchResponse(
    val active: Boolean,
    val reason: String?,
    val updatedAt: LocalDateTime
)

data class LedgerConsistencyResponse(
    val userId: Long,
    val isConsistent: Boolean,
    val availableBalance: Int,
    val calculatedAvailableFromLedger: Int,
    val heldBalance: Int,
    val calculatedHeldFromLedger: Int,
    val transactionCount: Int
)

data class CoinLedgerMetricsResponse(
    val totalGranted: Long,
    val totalAdjustedAdd: Long,
    val totalAdjustedSub: Long,
    val totalSpent: Long = 0L,
    val totalAvailableBalance: Long,
    val totalHeldBalance: Long,
    val isLedgerConsistent: Boolean,
    val totalAccounts: Long,
    val tshirtGoalTarget: Int = 3600,
    val tshirtGoalReachedUsers: Long,
    val hoodieGoalTarget: Int = 7200,
    val hoodieGoalReachedUsers: Long
)

