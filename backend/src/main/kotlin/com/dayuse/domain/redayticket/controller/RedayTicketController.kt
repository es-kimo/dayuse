package com.dayuse.domain.redayticket.controller

import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.dto.ApplyRedayResponse
import com.dayuse.domain.redayticket.dto.GrantRedayTicketRequest
import com.dayuse.domain.redayticket.dto.GrantRedayTicketResponse
import com.dayuse.domain.redayticket.dto.RedayTicketBalanceResponse
import com.dayuse.domain.redayticket.dto.RedayTicketHistoryResponse
import com.dayuse.domain.redayticket.service.RedayTicketService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/reday-tickets")
class RedayTicketController(
    private val redayTicketService: RedayTicketService
) {

    /**
     * 본인의 리데이 티켓 잔액 조회
     */
    @GetMapping("/balance")
    fun getBalance(
        @CurrentUserId userId: Long
    ): ResponseEntity<RedayTicketBalanceResponse> {
        val response = redayTicketService.getBalance(userId, userId)
        return ResponseEntity.ok(response)
    }

    /**
     * 본인의 리데이 티켓 이력 조회
     */
    @GetMapping("/history")
    fun getHistory(
        @CurrentUserId userId: Long
    ): ResponseEntity<RedayTicketHistoryResponse> {
        val response = redayTicketService.getHistory(userId, userId)
        return ResponseEntity.ok(response)
    }

    /**
     * 리데이 티켓 발급 (보상형 광고 등)
     */
    @PostMapping("/grant")
    fun grantTicket(
        @CurrentUserId userId: Long,
        @RequestBody request: GrantRedayTicketRequest
    ): ResponseEntity<GrantRedayTicketResponse> {
        val response = redayTicketService.grantTicket(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    /**
     * 리데이 적용 (티켓 소비 + 벌금 면제 원자적 처리)
     */
    @PostMapping("/apply")
    fun applyReday(
        @CurrentUserId userId: Long,
        @RequestBody request: ApplyRedayRequest
    ): ResponseEntity<ApplyRedayResponse> {
        val response = redayTicketService.applyReday(userId, request)
        return ResponseEntity.ok(response)
    }
}
