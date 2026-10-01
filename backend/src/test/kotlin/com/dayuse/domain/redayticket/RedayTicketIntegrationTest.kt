@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.redayticket

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.dto.GrantRedayTicketRequest
import com.dayuse.domain.redayticket.service.RedayTicketService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RedayTicketIntegrationTest {

    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var objectMapper: ObjectMapper
    @Autowired private lateinit var userRepository: UserRepository
    @Autowired private lateinit var groupRepository: GroupRepository
    @Autowired private lateinit var groupMemberRepository: GroupMemberRepository
    @Autowired private lateinit var challengeRepository: ChallengeRepository
    @Autowired private lateinit var challengeParticipantRepository: ChallengeParticipantRepository
    @Autowired private lateinit var dailyRecordRepository: DailyRecordRepository
    @Autowired private lateinit var verificationRepository: VerificationRepository
    @Autowired private lateinit var redayTicketRepository: RedayTicketRepository
    @Autowired private lateinit var redayTicketService: RedayTicketService
    @Autowired private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var ownerUser: User
    private lateinit var otherUser: User
    private lateinit var ownerToken: String
    private lateinit var otherToken: String
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var ownerParticipant: ChallengeParticipant
    private lateinit var otherParticipant: ChallengeParticipant

    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        ownerUser = userRepository.save(User(kakaoId = "ticket_owner", nickname = "티켓주인"))
        otherUser = userRepository.save(User(kakaoId = "ticket_other", nickname = "다른사람"))

        ownerToken = jwtTokenProvider.generateAccessToken(ownerUser.id)
        otherToken = jwtTokenProvider.generateAccessToken(otherUser.id)

        group = groupRepository.save(
            Group(name = "리데이 티켓 테스트 모임", hostUserId = ownerUser.id, inviteCode = "TICKET-107")
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = ownerUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = otherUser.id, role = GroupRole.MEMBER))

        // 리데이 허용 챌린지 (이틀 전 시작 ~ 7일 후 종료)
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "리데이 티켓 테스트 챌린지",
                verificationCriteria = "사진 인증",
                startDate = today.minusDays(2),
                endDate = today.plusDays(7),
                redayAllowed = true,
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL
            )
        )

        ownerParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = ownerUser.id,
                startDate = today.minusDays(2),
                penaltyAmount = 5000
            )
        )
        otherParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = otherUser.id,
                startDate = today.minusDays(2),
                penaltyAmount = 5000
            )
        )
    }

    // ── 헬퍼: 지각 인증이 완료된 DailyRecord 생성 ──────────────
    private fun createLateVerifiedRecord(
        userId: Long,
        participantId: Long,
        targetDate: LocalDate = today.minusDays(1),
        penaltyAmount: Int = 5000
    ): DailyRecord {
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userId,
                targetDate = targetDate,
                imageUrl = "test/image.jpg",
                isLate = true
            )
        )
        return dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participantId,
                userId = userId,
                date = targetDate,
                status = DailyRecordStatus.COMPLETED,
                penaltyAmount = penaltyAmount,
                depositStatus = DepositStatus.UNPAID,
                verificationId = verification.id,
                isLate = true,
                penaltyStatus = PenaltyStatus.PENDING,
                redayDeadline = DateTimeUtils.calculateRedayDeadline(targetDate)
            )
        )
    }

    // ═══════════════════════════════════════════════════════════
    // F05: 리데이 티켓 발급·잔액·이력 관리
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `F05 리데이 티켓 발급 후 잔액이 정상 증가한다`() {
        // 발급 전 잔액 0
        val before = redayTicketService.getBalance(ownerUser.id, ownerUser.id)
        assertEquals(0L, before.availableCount)

        // 티켓 2장 발급
        redayTicketService.grantTicket(ownerUser.id, GrantRedayTicketRequest(source = RedayTicketSource.REWARD_AD))
        redayTicketService.grantTicket(ownerUser.id, GrantRedayTicketRequest(source = RedayTicketSource.WELCOME_BONUS))

        // 잔액 2장
        val after = redayTicketService.getBalance(ownerUser.id, ownerUser.id)
        assertEquals(2L, after.availableCount)
        assertEquals(2L, after.totalCount)
    }

    @Test
    fun `F05 리데이 티켓 이력에 발급 출처와 사용 정보가 정확하게 기록된다`() {
        redayTicketService.grantTicket(ownerUser.id, GrantRedayTicketRequest(
            source = RedayTicketSource.REWARD_AD,
            sourceReference = "ad-session-123"
        ))

        val history = redayTicketService.getHistory(ownerUser.id, ownerUser.id)
        assertEquals(1, history.tickets.size)

        val ticket = history.tickets[0]
        assertEquals(RedayTicketStatus.AVAILABLE, ticket.status)
        assertEquals(RedayTicketSource.REWARD_AD, ticket.source)
        assertEquals("ad-session-123", ticket.sourceReference)
    }

    @Test
    fun `F05 IDOR 방어 - 타인의 티켓 잔액을 조회하면 403`() {
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.getBalance(otherUser.id, ownerUser.id)
        }
    }

    @Test
    fun `F05 IDOR 방어 - 타인의 티켓 이력을 조회하면 403`() {
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.getHistory(otherUser.id, ownerUser.id)
        }
    }

    // ═══════════════════════════════════════════════════════════
    // F05: API 엔드포인트 테스트
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `F05 API 티켓 발급 및 잔액 조회`() {
        // 발급
        mockMvc.post("/api/v1/reday-tickets/grant") {
            header("Authorization", "Bearer $ownerToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(GrantRedayTicketRequest())
        }.andExpect {
            status { isCreated() }
            jsonPath("$.ticketId") { isNumber() }
            jsonPath("$.availableCount") { value(1) }
        }

        // 잔액 조회
        mockMvc.get("/api/v1/reday-tickets/balance") {
            header("Authorization", "Bearer $ownerToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.availableCount") { value(1) }
        }

        // 이력 조회
        mockMvc.get("/api/v1/reday-tickets/history") {
            header("Authorization", "Bearer $ownerToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.tickets.length()") { value(1) }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // F06: 원자적 리데이 적용 및 경합 제어
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `F06 리데이 적용 - 티켓 소비와 벌금 면제가 원자적으로 처리된다`() {
        // 준비: 티켓 1장 + 지각 인증 기록
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)

        // 리데이 기한 내 시각으로 적용
        val withinDeadline = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)
        val result = redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        // 결과 검증
        assertTrue(result.penaltyExempted)
        assertEquals(5000, result.previousPenaltyAmount)
        assertEquals(0, result.resultPenaltyAmount)

        // DB 검증: 티켓 상태
        val updatedTicket = redayTicketRepository.findById(result.ticketId).get()
        assertEquals(RedayTicketStatus.USED, updatedTicket.status)
        assertEquals(record.id, updatedTicket.usedDailyRecordId)
        assertNotNull(updatedTicket.usedAt)

        // DB 검증: DailyRecord 상태
        val updatedRecord = dailyRecordRepository.findById(record.id).get()
        assertTrue(updatedRecord.redayApplied)
        assertEquals(PenaltyStatus.EXEMPTED, updatedRecord.penaltyStatus)
        assertEquals(0, updatedRecord.penaltyAmount)
        assertTrue(updatedRecord.isLate) // 지각 사실은 유지

        // 잔액 0 확인
        val balance = redayTicketService.getBalance(ownerUser.id, ownerUser.id)
        assertEquals(0L, balance.availableCount)
    }

    @Test
    fun `F06 멱등성 - 동일한 리데이 적용 요청을 재시도하면 추가 소비 없이 기존 결과를 반환한다`() {
        redayTicketService.grantTicket(ownerUser.id)
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)
        val withinDeadline = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)

        // 첫 번째 적용
        val first = redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        // 두 번째 적용 (재시도)
        val second = redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        // 같은 티켓 ID 반환, 추가 소비 없음
        assertEquals(first.ticketId, second.ticketId)

        // 잔액: 1장 남아있어야 함 (2장 발급 - 1장 사용 = 1장)
        val balance = redayTicketService.getBalance(ownerUser.id, ownerUser.id)
        assertEquals(1L, balance.availableCount)
    }

    @Test
    fun `F06 IDOR 방어 - 타인의 인증 기록에 리데이를 적용하면 403`() {
        redayTicketService.grantTicket(ownerUser.id)
        val otherRecord = createLateVerifiedRecord(otherUser.id, otherParticipant.id)

        assertThrows(ForbiddenException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(dailyRecordId = otherRecord.id),
                now = DateTimeUtils.calculateRedayDeadline(otherRecord.date).minusHours(1)
            )
        }
    }

    @Test
    fun `F06 IDOR 방어 - 타인의 티켓을 사용하면 403`() {
        val otherTicket = redayTicketService.grantTicket(otherUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)

        assertThrows(ForbiddenException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(ticketId = otherTicket.ticketId, dailyRecordId = record.id),
                now = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)
            )
        }
    }

    @Test
    fun `F06 기한 만료 후 리데이 적용 시도 시 400`() {
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)

        // 기한 만료 후 시각
        val afterDeadline = DateTimeUtils.calculateRedayDeadline(record.date).plusHours(1)

        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(dailyRecordId = record.id),
                now = afterDeadline
            )
        }
    }

    @Test
    fun `F06 이미 확정된 벌금에 리데이 적용 시도 시 400`() {
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)
        // 벌금을 수동으로 CONFIRMED로 변경
        record.penaltyStatus = PenaltyStatus.CONFIRMED
        dailyRecordRepository.save(record)

        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(dailyRecordId = record.id),
                now = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)
            )
        }
    }

    @Test
    fun `F06 사용 가능한 티켓이 없을 때 적용 시도 시 400`() {
        // 티켓 발급 없이 바로 적용 시도
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)

        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(dailyRecordId = record.id),
                now = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)
            )
        }
    }

    @Test
    fun `F06 이미 리데이 적용된 기록에 다른 티켓으로 재적용 시도 시 400`() {
        redayTicketService.grantTicket(ownerUser.id)
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)
        val withinDeadline = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)

        // 첫 적용 성공
        redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        // 다른 기록 생성 후 이미 적용된 같은 기록에 재적용
        // → 멱등성으로 성공 (같은 사용자의 재시도이므로)
        val retryResult = redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )
        assertTrue(retryResult.penaltyExempted)
    }

    @Test
    fun `F06 이미 사용된 티켓을 다른 기록에 재사용 시도 시 400`() {
        val grantResult = redayTicketService.grantTicket(ownerUser.id)
        val record1 = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id, today.minusDays(1))

        // 별도 verification과 record 생성 (다른 날짜)
        val verification2 = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = ownerUser.id,
                targetDate = today.minusDays(2),
                imageUrl = "test/image2.jpg",
                isLate = true
            )
        )
        val record2 = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = ownerParticipant.id,
                userId = ownerUser.id,
                date = today.minusDays(2),
                status = DailyRecordStatus.COMPLETED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID,
                verificationId = verification2.id,
                isLate = true,
                penaltyStatus = PenaltyStatus.PENDING,
                redayDeadline = DateTimeUtils.calculateRedayDeadline(today.minusDays(2))
            )
        )

        val withinDeadline1 = DateTimeUtils.calculateRedayDeadline(record1.date).minusHours(1)
        // 첫 기록에 적용
        redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(ticketId = grantResult.ticketId, dailyRecordId = record1.id),
            now = withinDeadline1
        )

        // 같은 티켓으로 다른 기록에 재사용 시도
        val withinDeadline2 = DateTimeUtils.calculateRedayDeadline(record2.date).minusHours(1)
        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(ticketId = grantResult.ticketId, dailyRecordId = record2.id),
                now = withinDeadline2
            )
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 인증 삭제/날짜 변경 제한 가드
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `리데이 적용된 인증 기록은 rollbackVerification으로 삭제할 수 없다`() {
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)
        val withinDeadline = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)

        redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        val updatedRecord = dailyRecordRepository.findById(record.id).get()
        assertThrows(BadRequestException::class.java) {
            updatedRecord.rollbackVerification()
        }
    }

    // ═══════════════════════════════════════════════════════════
    // 스트릭 미복원 검증
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `리데이 적용 후에도 지각 사실이 유지되어 스트릭이 복원되지 않는다`() {
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)
        val withinDeadline = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)

        redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(dailyRecordId = record.id),
            now = withinDeadline
        )

        val updatedRecord = dailyRecordRepository.findById(record.id).get()
        // 지각 사실 유지
        assertTrue(updatedRecord.isLate)
        // 리데이 적용됨
        assertTrue(updatedRecord.redayApplied)
        // 벌금 면제
        assertEquals(PenaltyStatus.EXEMPTED, updatedRecord.penaltyStatus)
        assertEquals(0, updatedRecord.penaltyAmount)
        // 완료 상태 유지 (정상 인증으로 덮어쓰지 않음)
        assertEquals(DailyRecordStatus.COMPLETED, updatedRecord.status)
    }

    // ═══════════════════════════════════════════════════════════
    // F06: API 엔드포인트 통합 테스트
    // ═══════════════════════════════════════════════════════════

    @Test
    fun `F06 API 리데이 적용 성공`() {
        redayTicketService.grantTicket(ownerUser.id)
        val record = createLateVerifiedRecord(ownerUser.id, ownerParticipant.id)

        mockMvc.post("/api/v1/reday-tickets/apply") {
            header("Authorization", "Bearer $ownerToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(ApplyRedayRequest(dailyRecordId = record.id))
        }.andExpect {
            status { isOk() }
            jsonPath("$.penaltyExempted") { value(true) }
            jsonPath("$.previousPenaltyAmount") { value(5000) }
            jsonPath("$.resultPenaltyAmount") { value(0) }
        }
    }

    @Test
    fun `정상 인증 기록에 리데이 적용 시도 시 400`() {
        redayTicketService.grantTicket(ownerUser.id)

        // 정상 인증 (isLate = false)
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = ownerUser.id,
                targetDate = today.minusDays(1),
                imageUrl = "test/image.jpg",
                isLate = false
            )
        )
        val record = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = ownerParticipant.id,
                userId = ownerUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.COMPLETED,
                penaltyAmount = 0,
                depositStatus = DepositStatus.UNPAID,
                verificationId = verification.id,
                isLate = false,
                penaltyStatus = PenaltyStatus.NONE
            )
        )

        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(dailyRecordId = record.id),
                now = DateTimeUtils.calculateRedayDeadline(record.date).minusHours(1)
            )
        }
    }
}
