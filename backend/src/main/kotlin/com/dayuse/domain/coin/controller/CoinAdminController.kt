package com.dayuse.domain.coin.controller

import com.dayuse.domain.coin.dto.*
import com.dayuse.domain.coin.service.CoinEmergencyControlService
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/v1/admin/coins", "/api/admin/coins")
class CoinAdminController(
    private val coinTransactionService: CoinTransactionService,
    private val coinEmergencyControlService: CoinEmergencyControlService
) {

    /**
     * 이상 징후 또는 비상 격리된 보류(HOLD) 목록 조회
     */
    @GetMapping("/held")
    fun getHeldTransactions(): ResponseEntity<List<CoinTransactionResponse>> {
        val list = coinTransactionService.getHeldTransactions()
        return ResponseEntity.ok(list)
    }

    /**
     * 보류 건 관리자 승인 (HOLD -> RELEASE)
     */
    @PostMapping("/held/{transactionId}/approve")
    fun approveHeld(
        @PathVariable transactionId: Long,
        @CurrentUserId adminUserId: Long
    ): ResponseEntity<CoinTransactionResponse> {
        val releasedTx = coinTransactionService.approveHeldTransaction(transactionId, adminUserId)
        return ResponseEntity.ok(CoinTransactionResponse.from(releasedTx))
    }

    /**
     * 보류 건 관리자 반려 (HOLD -> REJECT)
     */
    @PostMapping("/held/{transactionId}/reject")
    fun rejectHeld(
        @PathVariable transactionId: Long,
        @RequestBody(required = false) request: RejectHeldTransactionRequest?,
        @CurrentUserId adminUserId: Long
    ): ResponseEntity<CoinTransactionResponse> {
        val rejectedTx = coinTransactionService.rejectHeldTransaction(
            transactionId = transactionId,
            adminUserId = adminUserId,
            reason = request?.reason
        )
        return ResponseEntity.ok(CoinTransactionResponse.from(rejectedTx))
    }

    /**
     * 관리자 수동 차액 보정 (인증 삭제/취소/조건 변경에 따른 차액 반영)
     */
    @PostMapping("/users/{userId}/adjust")
    fun adjustCoins(
        @PathVariable userId: Long,
        @Valid @RequestBody request: AdjustCoinRequest,
        @CurrentUserId adminUserId: Long
    ): ResponseEntity<CoinTransactionResponse> {
        val reasonWithAdmin = "${request.reason ?: "관리자 수동 차액 보정"} (관리자 ID: $adminUserId)"
        val tx = coinTransactionService.adjustCoins(
            userId = userId,
            challengeId = request.challengeId,
            targetDate = request.targetDate,
            adjustmentAmount = request.adjustmentAmount,
            reason = reasonWithAdmin
        )
        return ResponseEntity.ok(CoinTransactionResponse.from(tx))
    }

    /**
     * 비상 지급 중지(Kill Switch) 상태 조회
     */
    @GetMapping("/kill-switch")
    fun getKillSwitchStatus(): ResponseEntity<KillSwitchResponse> {
        return ResponseEntity.ok(coinEmergencyControlService.getKillSwitchStatus())
    }

    /**
     * 비상 지급 중지(Kill Switch) 설정 및 해제
     */
    @PostMapping("/kill-switch")
    fun setKillSwitch(
        @RequestBody request: KillSwitchRequest,
        @CurrentUserId adminUserId: Long
    ): ResponseEntity<KillSwitchResponse> {
        val reasonWithAdmin = "${request.reason ?: "관리자 요청"} (관리자 ID: $adminUserId)"
        val status = coinEmergencyControlService.setKillSwitch(
            active = request.active,
            reason = reasonWithAdmin
        )
        return ResponseEntity.ok(status)
    }
}
