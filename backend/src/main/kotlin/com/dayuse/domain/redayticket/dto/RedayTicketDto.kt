package com.dayuse.domain.redayticket.dto

import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import java.time.LocalDateTime

/**
 * 리데이 티켓 잔액 응답 (본인에게만 노출)
 */
data class RedayTicketBalanceResponse(
    val userId: Long,
    val availableCount: Long,
    val totalCount: Long
)

/**
 * 리데이 티켓 이력 아이템
 */
data class RedayTicketHistoryItem(
    val id: Long,
    val status: RedayTicketStatus,
    val source: RedayTicketSource,
    val sourceReference: String?,
    val usedDailyRecordId: Long?,
    val usedAt: LocalDateTime?,
    val createdAt: LocalDateTime
)

/**
 * 리데이 티켓 이력 응답 (본인에게만 노출)
 */
data class RedayTicketHistoryResponse(
    val userId: Long,
    val tickets: List<RedayTicketHistoryItem>
)

/**
 * 리데이 티켓 발급 요청
 */
data class GrantRedayTicketRequest(
    val source: RedayTicketSource = RedayTicketSource.REWARD_AD,
    val sourceReference: String? = null
)

/**
 * 리데이 티켓 발급 응답
 */
data class GrantRedayTicketResponse(
    val ticketId: Long,
    val userId: Long,
    val source: RedayTicketSource,
    val availableCount: Long
)

/**
 * 리데이 적용 요청
 */
data class ApplyRedayRequest(
    val ticketId: Long? = null,
    val dailyRecordId: Long
)

/**
 * 리데이 적용 응답
 */
data class ApplyRedayResponse(
    val ticketId: Long,
    val dailyRecordId: Long,
    val penaltyExempted: Boolean,
    val previousPenaltyAmount: Int,
    val resultPenaltyAmount: Int,
    val appliedAt: LocalDateTime
)
