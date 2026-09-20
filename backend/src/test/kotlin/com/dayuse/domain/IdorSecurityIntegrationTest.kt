@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain

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
import com.dayuse.domain.settlement.DepositReport
import com.dayuse.domain.settlement.DepositReportRepository
import com.dayuse.domain.settlement.DepositReportStatus
import com.dayuse.domain.settlement.GroupAccount
import com.dayuse.domain.settlement.GroupAccountRepository
import com.dayuse.domain.settlement.dto.CancelConfirmationRequest
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.dto.RejectDepositReportRequest
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationComment
import com.dayuse.domain.verification.VerificationCommentRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
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
@DisplayName("IDOR 보안 및 데이터 격리 통합 테스트")
class IdorSecurityIntegrationTest {

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
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var verificationCommentRepository: VerificationCommentRepository

    @Autowired
    private lateinit var groupAccountRepository: GroupAccountRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var userA: User
    private lateinit var tokenA: String

    private lateinit var userB: User
    private lateinit var tokenB: String

    private lateinit var groupA: Group
    private lateinit var groupB: Group

    private lateinit var challengeA: Challenge
    private lateinit var verificationA: Verification
    private lateinit var commentA: VerificationComment
    private lateinit var accountA: GroupAccount
    private lateinit var recordA: DailyRecord
    private lateinit var reportA: DepositReport

    private val today = LocalDate.now()

    @BeforeEach
    fun setUp() {
        // 1. 사용자 생성
        userA = userRepository.save(
            User(kakaoId = "kakao-user-a", nickname = "모임A모임장")
        )
        tokenA = jwtTokenProvider.generateAccessToken(userA.id)

        userB = userRepository.save(
            User(kakaoId = "kakao-user-b", nickname = "모임B사용자")
        )
        tokenB = jwtTokenProvider.generateAccessToken(userB.id)

        // 2. 모임 생성 및 멤버 매핑
        groupA = groupRepository.save(
            Group(name = "비공개 모임 A", hostUserId = userA.id, inviteCode = "INVITE-A-12345")
        )
        groupMemberRepository.save(
            GroupMember(groupId = groupA.id, userId = userA.id, role = GroupRole.HOST)
        )

        groupB = groupRepository.save(
            Group(name = "비공개 모임 B", hostUserId = userB.id, inviteCode = "INVITE-B-12345")
        )
        groupMemberRepository.save(
            GroupMember(groupId = groupB.id, userId = userB.id, role = GroupRole.HOST)
        )

        // 3. 모임 A 챌린지 생성
        challengeA = challengeRepository.save(
            Challenge(
                groupId = groupA.id,
                creatorUserId = userA.id,
                title = "모임 A의 전용 챌린지",
                description = "모임 A 멤버만 참여 가능",
                verificationCriteria = "인증 기준 사진",
                startDate = today,
                endDate = today.plusDays(13)
            )
        )
        val participantA = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challengeA.id,
                userId = userA.id,
                penaltyAmount = 5000
            )
        )

        // 4. 모임 A 인증 사진 및 댓글
        verificationA = verificationRepository.save(
            Verification(
                groupId = groupA.id,
                challengeId = challengeA.id,
                userId = userA.id,
                targetDate = today,
                imageUrl = "https://s3.amazonaws.com/dayuse/groupA-secret.jpg",
                comment = "모임 A 비밀 인증"
            )
        )
        commentA = verificationCommentRepository.save(
            VerificationComment(
                verification = verificationA,
                userId = userA.id,
                content = "모임 A 댓글 내용"
            )
        )

        // 5. 모임 A 계좌 정보
        accountA = groupAccountRepository.save(
            GroupAccount(
                groupId = groupA.id,
                bankName = "카카오뱅크",
                accountNumber = "3333-01-1234567",
                accountHolder = "모임A계좌주"
            )
        )

        // 6. 모임 A 일일 기록
        recordA = dailyRecordRepository.save(
            DailyRecord(
                userId = userA.id,
                groupId = groupA.id,
                challengeId = challengeA.id,
                challengeParticipantId = participantA.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.FAILED,
                depositStatus = DepositStatus.UNPAID,
                penaltyAmount = 5000
            )
        )

        // 7. 모임 A 입금 신고
        reportA = depositReportRepository.save(
            DepositReport(
                groupId = groupA.id,
                userId = userA.id,
                depositorName = "모임A입금자",
                depositDate = today,
                totalAmount = 5000,
                status = DepositReportStatus.WAITING_CONFIRMATION
            )
        )
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 챌린지 목록 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupChallenges() {
        mockMvc.get("/api/v1/groups/${groupA.id}/challenges") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 챌린지 상세 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupChallengeDetail() {
        mockMvc.get("/api/v1/challenges/${challengeA.id}") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임 챌린지에 참여 시도 시 403 Forbidden 차단된다")
    fun blockJoinOtherGroupChallenge() {
        val body = mapOf("penaltyAmount" to 5000)
        mockMvc.post("/api/v1/challenges/${challengeA.id}/participants") {
            header("Authorization", "Bearer $tokenB")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(body)
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 인증 피드 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupFeed() {
        mockMvc.get("/api/v1/groups/${groupA.id}/feed") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임 인증 댓글 목록 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupComments() {
        mockMvc.get("/api/v1/verifications/${verificationA.id}/comments") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임 인증에 댓글 작성 시 403 Forbidden 차단된다")
    fun blockPostCommentOnOtherGroupVerification() {
        val body = mapOf("content" to "타 모임 불법 침입 댓글")
        mockMvc.post("/api/v1/verifications/${verificationA.id}/comments") {
            header("Authorization", "Bearer $tokenB")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(body)
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 정산 요약(미납/대기/누적액) 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupSettlementSummary() {
        mockMvc.get("/api/v1/groups/${groupA.id}/settlement-summary") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 계좌 정보 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupAccount() {
        mockMvc.get("/api/v1/groups/${groupA.id}/account") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 계좌 정보 수정 시도 시 403 Forbidden 차단된다")
    fun blockUpdateOtherGroupAccount() {
        val request = GroupAccountRequest(
            bankName = "해커은행",
            accountNumber = "9999-99-9999999",
            accountHolder = "해커"
        )
        mockMvc.put("/api/v1/groups/${groupA.id}/account") {
            header("Authorization", "Bearer $tokenB")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 미납 기록 목록 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupUnpaidRecords() {
        mockMvc.get("/api/v1/groups/${groupA.id}/unpaid-records") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임으로 입금 신고 생성 시도 시 403 Forbidden 차단된다")
    fun blockCreateDepositReportOnOtherGroup() {
        val request = CreateDepositReportRequest(
            depositorName = "타모임입금자",
            depositDate = today,
            totalAmount = 5000,
            dailyRecordIds = listOf(recordA.id)
        )
        mockMvc.post("/api/v1/groups/${groupA.id}/deposit-reports") {
            header("Authorization", "Bearer $tokenB")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임의 입금 신고 목록 조회 시 403 Forbidden 차단된다")
    fun blockAccessToOtherGroupDepositReports() {
        mockMvc.get("/api/v1/groups/${groupA.id}/deposit-reports") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("타 모임 사용자가 타 모임 입금 신고 건을 모임장 승인/반려 시도 시 403 Forbidden 차단된다")
    fun blockConfirmOrRejectOtherGroupDepositReport() {
        // 승인 시도 차단
        mockMvc.post("/api/v1/deposit-reports/${reportA.id}/confirm") {
            header("Authorization", "Bearer $tokenB")
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }

        // 반려 시도 차단
        val rejectRequest = RejectDepositReportRequest(reason = "타 모임 사용자의 불법 반려 시도")
        mockMvc.post("/api/v1/deposit-reports/${reportA.id}/reject") {
            header("Authorization", "Bearer $tokenB")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(rejectRequest)
        }.andExpect {
            status { isForbidden() }
            jsonPath("$.status") { value(403) }
            jsonPath("$.error") { value("FORBIDDEN") }
        }
    }

    @Test
    @DisplayName("인증 헤더가 없는 요청은 일관된 401 Unauthorized ErrorResponse 규격을 반환한다")
    fun blockUnauthenticatedRequests() {
        mockMvc.get("/api/v1/groups/${groupA.id}/challenges")
            .andExpect {
                status { isUnauthorized() }
                jsonPath("$.status") { value(401) }
                jsonPath("$.error") { value("UNAUTHORIZED") }
                jsonPath("$.message") { value("인증이 필요합니다.") }
                jsonPath("$.timestamp") { exists() }
            }
    }
}
