@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.settlement

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.settlement.dto.CancelConfirmationRequest
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.dto.RejectDepositReportRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SettlementIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var groupAccountRepository: GroupAccountRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    @Autowired
    private lateinit var depositReportItemRepository: DepositReportItemRepository

    @Autowired
    private lateinit var depositAuditLogRepository: DepositAuditLogRepository

    @Autowired
    private lateinit var settlementService: SettlementService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var strangerUser: User

    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var strangerToken: String

    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var record1: DailyRecord
    private lateinit var record2: DailyRecord
    private lateinit var zeroRecord: DailyRecord

    private val today: LocalDate = LocalDate.now()

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "host_kakao", nickname = "모임장"))
        memberUser = userRepository.save(User(kakaoId = "member_kakao", nickname = "모임원"))
        strangerUser = userRepository.save(User(kakaoId = "stranger_kakao", nickname = "외부인"))

        hostToken = jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = jwtTokenProvider.generateAccessToken(memberUser.id)
        strangerToken = jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(Group(name = "정산 모임", hostUserId = hostUser.id, inviteCode = "INVITE-SETTLE"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "정산 챌린지",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(5),
                endDate = today.plusDays(5)
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser.id, penaltyAmount = 5000)
        )

        // 미수행 확정 기록 2개 생성 (각 5,000원)
        record1 = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today.minusDays(2),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
        record2 = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
        // 0원 벌금 기록 생성
        zeroRecord = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today.minusDays(3),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 0,
                depositStatus = DepositStatus.UNPAID
            )
        )
    }

    @Test
    fun `모임장은 모임 계좌를 등록 및 수정할 수 있고 일반 멤버는 조회만 가능하다`() {
        // 1. 등록 전 계좌 조회 (null)
        mockMvc.get("/api/v1/groups/${group.id}/account") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
        }

        // 2. 일반 멤버가 등록 시도 -> 403 Forbidden
        val accountRequest = GroupAccountRequest(
            bankName = "카카오뱅크",
            accountNumber = "3333-01-1234567",
            accountHolder = "모임장"
        )
        mockMvc.put("/api/v1/groups/${group.id}/account") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(accountRequest)
        }.andExpect {
            status { isForbidden() }
        }

        // 3. 모임장이 계좌 등록 -> 200 OK
        mockMvc.put("/api/v1/groups/${group.id}/account") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(accountRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.bankName") { value("카카오뱅크") }
            jsonPath("$.accountNumber") { value("3333-01-1234567") }
            jsonPath("$.accountHolder") { value("모임장") }
        }

        // 4. 모임원이 계좌 조회 -> 정상 반환
        mockMvc.get("/api/v1/groups/${group.id}/account") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.bankName") { value("카카오뱅크") }
            jsonPath("$.accountHolder") { value("모임장") }
        }

        // 5. 모임장이 계좌 수정 -> 200 OK
        val updateRequest = GroupAccountRequest(
            bankName = "토스뱅크",
            accountNumber = "1000-1234-5678",
            accountHolder = "모임장"
        )
        mockMvc.put("/api/v1/groups/${group.id}/account") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.bankName") { value("토스뱅크") }
            jsonPath("$.accountNumber") { value("1000-1234-5678") }
        }
    }

    @Test
    fun `모임 계좌가 없으면 입금 신고가 차단된다`() {
        val reportRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )

        mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(reportRequest)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("모임 계좌가 등록되지 않아 입금 신고를 진행할 수 없습니다. (ACCOUNT_NOT_REGISTERED)") }
        }
    }

    @Test
    fun `내 미납 기록 목록 조회 시 0원인 기록은 제외되고 미수행 미납 기록만 반환된다`() {
        mockMvc.get("/api/v1/groups/${group.id}/unpaid-records") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
            jsonPath("$[0].penaltyAmount") { value(5000) }
            jsonPath("$[1].penaltyAmount") { value(5000) }
        }
    }

    @Test
    fun `신고 총액과 선택한 미납 기록 벌금 합계가 불일치하면 신고가 차단된다`() {
        registerAccount()

        val reportRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 8000, // 실제 합계는 10000원
            dailyRecordIds = listOf(record1.id, record2.id)
        )

        mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(reportRequest)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `0원인 기록이 신고 목록에 포함되면 차단된다`() {
        registerAccount()

        val reportRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 5000,
            dailyRecordIds = listOf(zeroRecord.id, record1.id)
        )

        mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(reportRequest)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `정상 입금 신고 시 대기 상태로 전환되고 레코드 락 및 감사 로그가 기록된다`() {
        registerAccount()

        val reportRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )

        mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(reportRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.status") { value("WAITING_CONFIRMATION") }
            jsonPath("$.totalAmount") { value(10000) }
            jsonPath("$.items.length()") { value(2) }
            jsonPath("$.auditLogs[0].action") { value("REPORTED") }
        }

        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(DepositStatus.WAITING_CONFIRMATION, r1.depositStatus)
        assertEquals(DepositStatus.WAITING_CONFIRMATION, r2.depositStatus)
    }

    @Test
    fun `신고자는 대기 상태인 본인의 입금 신고를 취소할 수 있고 기록은 미납으로 원복된다`() {
        registerAccount()

        val createRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )
        val detail = settlementService.createDepositReport(group.id, memberUser.id, createRequest)

        // 다른 사용자가 취소 시도 -> 403 Forbidden
        mockMvc.delete("/api/v1/deposit-reports/${detail.id}") {
            header("Authorization", "Bearer $strangerToken")
        }.andExpect {
            status { isForbidden() }
        }

        // 본인이 취소 -> 200 OK
        mockMvc.delete("/api/v1/deposit-reports/${detail.id}") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("CANCELLED") }
        }

        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(DepositStatus.UNPAID, r1.depositStatus)
        assertEquals(DepositStatus.UNPAID, r2.depositStatus)

        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(detail.id)
        assertTrue(auditLogs.any { it.action == DepositAuditAction.CANCELLED_BY_USER })
    }

    @Test
    fun `모임장은 입금 신고를 승인할 수 있고 완료 시 레코드 상태가 CONFIRMED로 변경된다`() {
        registerAccount()

        val createRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )
        val detail = settlementService.createDepositReport(group.id, memberUser.id, createRequest)

        // 일반 멤버가 승인 시도 -> 403 Forbidden
        mockMvc.post("/api/v1/deposit-reports/${detail.id}/confirm") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isForbidden() }
        }

        // 모임장 승인 -> 200 OK
        mockMvc.post("/api/v1/deposit-reports/${detail.id}/confirm") {
            header("Authorization", "Bearer $hostToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("CONFIRMED") }
            jsonPath("$.processedByUserId") { value(hostUser.id) }
        }

        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(DepositStatus.CONFIRMED, r1.depositStatus)
        assertEquals(DepositStatus.CONFIRMED, r2.depositStatus)

        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(detail.id)
        assertTrue(auditLogs.any { it.action == DepositAuditAction.CONFIRMED_BY_HOST })
    }

    @Test
    fun `모임장은 사유와 함께 입금 신고를 반려할 수 있고 레코드는 미납으로 원복된다`() {
        registerAccount()

        val createRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )
        val detail = settlementService.createDepositReport(group.id, memberUser.id, createRequest)

        // 사유 누락 시 차단
        val emptyReasonRequest = RejectDepositReportRequest(reason = "")
        mockMvc.post("/api/v1/deposit-reports/${detail.id}/reject") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(emptyReasonRequest)
        }.andExpect {
            status { isBadRequest() }
        }

        // 사유 입력 후 반려
        val rejectRequest = RejectDepositReportRequest(reason = "실제 입금 내역이 확인되지 않습니다.")
        mockMvc.post("/api/v1/deposit-reports/${detail.id}/reject") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(rejectRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("REJECTED") }
            jsonPath("$.rejectReason") { value("실제 입금 내역이 확인되지 않습니다.") }
        }

        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(DepositStatus.UNPAID, r1.depositStatus)
        assertEquals(DepositStatus.UNPAID, r2.depositStatus)

        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(detail.id)
        val rejectLog = auditLogs.find { it.action == DepositAuditAction.REJECTED_BY_HOST }
        assertNotNull(rejectLog)
        assertEquals("실제 입금 내역이 확인되지 않습니다.", rejectLog?.reason)
    }

    @Test
    fun `모임장이 승인을 취소하면 누적액에서 차감되고 연결 기록들이 다시 미납으로 안전하게 원복된다`() {
        registerAccount()

        val createRequest = CreateDepositReportRequest(
            depositorName = "홍길동",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(record1.id, record2.id)
        )
        val detail = settlementService.createDepositReport(group.id, memberUser.id, createRequest)
        settlementService.confirmDepositReport(detail.id, hostUser.id)

        // 승인 직후 정산 요약 확인
        val summaryAfterConfirm = settlementService.getSettlementSummary(group.id, hostUser.id)
        assertEquals(10000, summaryAfterConfirm.confirmedAmount)
        assertEquals(0, summaryAfterConfirm.unpaidAmount)

        // 승인 취소 API 호출
        val cancelRequest = CancelConfirmationRequest(reason = "입금 금액 오확인으로 인한 취소")
        mockMvc.post("/api/v1/deposit-reports/${detail.id}/cancel-confirmation") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(cancelRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("CANCELLED") }
            jsonPath("$.cancelReason") { value("입금 금액 오확인으로 인한 취소") }
        }

        // 원복 결과 검증
        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(DepositStatus.UNPAID, r1.depositStatus)
        assertEquals(DepositStatus.UNPAID, r2.depositStatus)

        // 정산 요약에서 누적 확인액 차감 및 미납액 복구 검증
        val summaryAfterCancel = settlementService.getSettlementSummary(group.id, hostUser.id)
        assertEquals(0, summaryAfterCancel.confirmedAmount)
        assertEquals(10000, summaryAfterCancel.unpaidAmount)

        // 감사 로그 검증
        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(detail.id)
        val cancelLog = auditLogs.find { it.action == DepositAuditAction.CONFIRMATION_CANCELLED_BY_HOST }
        assertNotNull(cancelLog)
        assertEquals("입금 금액 오확인으로 인한 취소", cancelLog?.reason)
    }

    private fun registerAccount() {
        val request = GroupAccountRequest(
            bankName = "카카오뱅크",
            accountNumber = "3333-01-1234567",
            accountHolder = "모임장"
        )
        settlementService.updateGroupAccount(group.id, hostUser.id, request)
    }
}
