package com.dayuse.domain.coin.controller

import com.dayuse.domain.coin.dto.CoinBalanceResponse
import com.dayuse.domain.coin.dto.CoinTransactionResponse
import com.dayuse.domain.coin.dto.LedgerConsistencyResponse
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.security.CurrentUserId
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/coins", "/api/coins")
class CoinController(
    private val coinTransactionService: CoinTransactionService
) {

    /**
     * 본인 코인 잔액 조회
     */
    @GetMapping("/me/balance")
    fun getMyBalance(@CurrentUserId userId: Long): ResponseEntity<CoinBalanceResponse> {
        val response = coinTransactionService.getBalance(userId)
        return ResponseEntity.ok(response)
    }

    /**
     * 본인 코인 거래 원장 내역 조회
     */
    @GetMapping("/me/transactions", "/me/history")
    fun getMyTransactions(
        @CurrentUserId userId: Long,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<CoinTransactionResponse>> {
        val response = coinTransactionService.getTransactions(userId, pageable)
        return ResponseEntity.ok(response)
    }

    /**
     * 본인 원장 일치성(M_end = M_start + I - S - R) 검증
     */
    @GetMapping("/me/consistency")
    fun verifyMyConsistency(@CurrentUserId userId: Long): ResponseEntity<LedgerConsistencyResponse> {
        val response = coinTransactionService.verifyLedgerConsistency(userId)
        return ResponseEntity.ok(response)
    }

    /**
     * 특정 사용자 코인 잔액 조회 (IDOR 방어: 타인 잔액 조회 차단)
     */
    @GetMapping("/users/{targetUserId}/balance")
    fun getUserBalance(
        @PathVariable targetUserId: Long,
        @CurrentUserId currentUserId: Long
    ): ResponseEntity<CoinBalanceResponse> {
        if (targetUserId != currentUserId) {
            throw ForbiddenException("자신의 코인 잔액만 조회할 수 있습니다.")
        }
        val response = coinTransactionService.getBalance(targetUserId)
        return ResponseEntity.ok(response)
    }

    /**
     * 특정 사용자 코인 내역 조회 (IDOR 방어: 타인 내역 조회 차단)
     */
    @GetMapping("/users/{targetUserId}/transactions")
    fun getUserTransactions(
        @PathVariable targetUserId: Long,
        @CurrentUserId currentUserId: Long,
        @PageableDefault(size = 20) pageable: Pageable
    ): ResponseEntity<Page<CoinTransactionResponse>> {
        if (targetUserId != currentUserId) {
            throw ForbiddenException("자신의 코인 거래 내역만 조회할 수 있습니다.")
        }
        val response = coinTransactionService.getTransactions(targetUserId, pageable)
        return ResponseEntity.ok(response)
    }
}
