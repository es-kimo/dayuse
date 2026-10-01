package com.dayuse.domain.redayticket.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.redayticket.RedayTicket
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.dto.ApplyRedayResponse
import com.dayuse.domain.redayticket.dto.GrantRedayTicketRequest
import com.dayuse.domain.redayticket.dto.GrantRedayTicketResponse
import com.dayuse.domain.redayticket.dto.RedayTicketBalanceResponse
import com.dayuse.domain.redayticket.dto.RedayTicketHistoryItem
import com.dayuse.domain.redayticket.dto.RedayTicketHistoryResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
class RedayTicketService(
    private val redayTicketRepository: RedayTicketRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository
) {

    // ── F05: 티켓 발급 ───────────────────────────────────────────

    /**
     * 사용자에게 리데이 티켓 1장을 발급합니다.
     */
    fun grantTicket(
        userId: Long,
        request: GrantRedayTicketRequest = GrantRedayTicketRequest()
    ): GrantRedayTicketResponse {
        val ticket = RedayTicket(
            userId = userId,
            status = RedayTicketStatus.AVAILABLE,
            source = request.source,
            sourceReference = request.sourceReference
        )
        val saved = redayTicketRepository.save(ticket)
        val availableCount = redayTicketRepository.countByUserIdAndStatus(userId, RedayTicketStatus.AVAILABLE)
        return GrantRedayTicketResponse(
            ticketId = saved.id,
            userId = userId,
            source = saved.source,
            availableCount = availableCount
        )
    }

    // ── F05: 잔액 조회 (본인만) ─────────────────────────────────

    /**
     * 본인의 리데이 티켓 잔액을 조회합니다.
     * 모임원에게는 비공개이므로 반드시 본인 요청만 허용합니다.
     */
    @Transactional(readOnly = true)
    fun getBalance(requestUserId: Long, targetUserId: Long): RedayTicketBalanceResponse {
        if (requestUserId != targetUserId) {
            throw ForbiddenException("본인의 리데이 티켓 잔액만 조회할 수 있습니다.")
        }
        val availableCount = redayTicketRepository.countByUserIdAndStatus(targetUserId, RedayTicketStatus.AVAILABLE)
        val totalCount = redayTicketRepository.findAllByUserId(targetUserId).size.toLong()
        return RedayTicketBalanceResponse(
            userId = targetUserId,
            availableCount = availableCount,
            totalCount = totalCount
        )
    }

    // ── F05: 이력 조회 (본인만) ─────────────────────────────────

    /**
     * 본인의 리데이 티켓 이력을 조회합니다.
     * 모임원에게는 비공개이므로 반드시 본인 요청만 허용합니다.
     */
    @Transactional(readOnly = true)
    fun getHistory(requestUserId: Long, targetUserId: Long): RedayTicketHistoryResponse {
        if (requestUserId != targetUserId) {
            throw ForbiddenException("본인의 리데이 티켓 이력만 조회할 수 있습니다.")
        }
        val tickets = redayTicketRepository.findAllByUserId(targetUserId)
        return RedayTicketHistoryResponse(
            userId = targetUserId,
            tickets = tickets.map {
                RedayTicketHistoryItem(
                    id = it.id,
                    status = it.status,
                    source = it.source,
                    sourceReference = it.sourceReference,
                    usedDailyRecordId = it.usedDailyRecordId,
                    usedAt = it.usedAt,
                    createdAt = it.createdAt
                )
            }
        )
    }

    // ── F06: 원자적 리데이 적용 ─────────────────────────────────

    /**
     * 리데이 티켓 1장을 사용하여 지각 인증 기록에 리데이를 적용합니다.
     *
     * 원자적 트랜잭션으로 다음 3가지를 동시 처리:
     * 1. 티켓 소비 (AVAILABLE → USED)
     * 2. 인증 기록 리데이 상태 반영 (redayApplied = true)
     * 3. 벌금 면제 (penaltyStatus = EXEMPTED, penaltyAmount = 0)
     *
     * 동시성 제어:
     * - 티켓에 비관적 잠금(SELECT ... FOR UPDATE)
     * - DailyRecord에 비관적 잠금
     * - usedDailyRecordId의 UNIQUE 제약으로 DB 레벨 중복 방어
     *
     * 멱등성:
     * - 동일한 티켓+기록 조합의 재시도는 추가 소비 없이 기존 결과 반환
     */
    fun applyReday(
        userId: Long,
        request: ApplyRedayRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ApplyRedayResponse {
        val dailyRecordId = request.dailyRecordId

        // ── 1. 멱등성 체크: 이미 해당 기록에 티켓이 적용되었는지 확인
        val existingTicket = redayTicketRepository.findByUsedDailyRecordId(dailyRecordId)
        if (existingTicket != null && existingTicket.userId == userId) {
            // 동일 사용자가 이미 적용한 경우 → 멱등 반환
            return ApplyRedayResponse(
                ticketId = existingTicket.id,
                dailyRecordId = dailyRecordId,
                penaltyExempted = true,
                previousPenaltyAmount = 0,
                resultPenaltyAmount = 0,
                appliedAt = existingTicket.usedAt ?: now
            )
        }

        // ── 2. DailyRecord 비관적 잠금으로 조회
        val records = dailyRecordRepository.findAllByIdInWithLock(listOf(dailyRecordId))
        if (records.isEmpty()) {
            throw ResourceNotFoundException("일일 기록을 찾을 수 없습니다.")
        }
        val record = records[0]

        // ── 3. IDOR 방어: 대상 인증 본인 소유 확인
        if (record.userId != userId) {
            throw ForbiddenException("본인의 인증 기록에만 리데이를 적용할 수 있습니다.")
        }

        // ── 4. 대상 기록 리데이 적격 상태 검증
        validateRecordForReday(record, now)

        // ── 5. 티켓 선택 및 비관적 잠금
        val ticket = if (request.ticketId != null) {
            // 특정 티켓 ID 지정된 경우
            val t = redayTicketRepository.findByIdWithLock(request.ticketId)
                ?: throw ResourceNotFoundException("리데이 티켓을 찾을 수 없습니다.")
            // IDOR 방어: 티켓 본인 소유 확인
            if (t.userId != userId) {
                throw ForbiddenException("본인의 리데이 티켓만 사용할 수 있습니다.")
            }
            if (!t.isAvailable) {
                // 멱등성: 같은 티켓이 같은 기록에 이미 사용된 경우
                if (t.usedDailyRecordId == dailyRecordId) {
                    return ApplyRedayResponse(
                        ticketId = t.id,
                        dailyRecordId = dailyRecordId,
                        penaltyExempted = true,
                        previousPenaltyAmount = 0,
                        resultPenaltyAmount = 0,
                        appliedAt = t.usedAt ?: now
                    )
                }
                throw BadRequestException("이미 사용된 리데이 티켓입니다.")
            }
            t
        } else {
            // FIFO 자동 선택
            val availableTickets = redayTicketRepository.findFirstAvailableByUserIdWithLock(userId)
            if (availableTickets.isEmpty()) {
                throw BadRequestException("사용 가능한 리데이 티켓이 없습니다.")
            }
            availableTickets[0]
        }

        // ── 6. 원자적 처리: 티켓 소비 + 기록 리데이 적용 + 벌금 면제
        val previousPenalty = record.penaltyAmount

        ticket.use(dailyRecordId, now)
        record.applyReday(now)

        return ApplyRedayResponse(
            ticketId = ticket.id,
            dailyRecordId = dailyRecordId,
            penaltyExempted = true,
            previousPenaltyAmount = previousPenalty,
            resultPenaltyAmount = 0,
            appliedAt = now
        )
    }

    /**
     * 대상 DailyRecord가 리데이 적용 가능한지 검증합니다.
     *
     * 검증 항목:
     * (1) 인증 완료 상태(COMPLETED)이고 지각(isLate=true)인지
     * (2) 리데이가 이미 적용되지 않았는지
     * (3) 현재 서버 시각이 리데이 기한(targetDate + 2일 09:00) 이내인지
     * (4) 벌금이 미확정·미정산 상태(PENDING)인지
     */
    private fun validateRecordForReday(record: DailyRecord, now: LocalDateTime) {
        // 이미 리데이 적용됨
        if (record.redayApplied || record.penaltyStatus == PenaltyStatus.EXEMPTED) {
            throw BadRequestException("이미 리데이가 적용된 기록입니다.")
        }

        // 정산 진행 중
        if (record.isLocked()) {
            throw BadRequestException("이미 입금 신고 중이거나 정산 완료된 기록에는 리데이를 적용할 수 없습니다.")
        }

        // 인증 완료 + 지각 상태 확인
        if (record.status != DailyRecordStatus.COMPLETED || record.verificationId == null) {
            throw BadRequestException("지각 인증을 먼저 등록해야 리데이를 사용할 수 있습니다.")
        }
        if (!record.isLate) {
            throw BadRequestException("정상 인증 또는 늦은 인증(익일 09시 전) 기록은 벌금이 없어 리데이 대상이 아닙니다.")
        }

        // 벌금 상태: PENDING만 허용 (CONFIRMED는 이미 확정, NONE은 벌금 없음)
        if (record.penaltyStatus == PenaltyStatus.CONFIRMED) {
            throw BadRequestException("이미 확정된 벌금에는 리데이를 적용할 수 없습니다.")
        }

        // 리데이 기한 확인
        val deadline = record.effectiveRedayDeadline()
        if (now >= deadline) {
            throw BadRequestException("리데이 가능 기한(대상일 이틀 뒤 오전 9시)이 지났습니다.")
        }

        // 챌린지가 리데이 허용인지 확인
        val challenge = challengeRepository.findById(record.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }
        if (!challenge.isRedayActive()) {
            throw BadRequestException("리데이가 허용되지 않은 챌린지입니다.")
        }
        if (challenge.isAborted()) {
            throw BadRequestException("중단된 챌린지 기록에는 리데이를 사용할 수 없습니다.")
        }
    }
}
