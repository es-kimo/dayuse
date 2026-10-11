@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.coin

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.domain.coin.dto.AdjustCoinRequest
import com.dayuse.domain.coin.dto.KillSwitchRequest
import com.dayuse.domain.coin.dto.RejectHeldTransactionRequest
import com.dayuse.domain.coin.service.CoinEmergencyControlService
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
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
@DisplayName("코인 원장·자동 지급·차액 보정·비상 통제 통합 테스트")
class CoinIntegrationTest {

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
    private lateinit var challengeResultService: ChallengeResultService

    @Autowired
    private lateinit var coinTransactionService: CoinTransactionService

    @Autowired
    private lateinit var coinEmergencyControlService: CoinEmergencyControlService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var user1: User
    private lateinit var user2: User
    private lateinit var adminUser: User
    private lateinit var token1: String
    private lateinit var token2: String
    private lateinit var adminToken: String

    @BeforeEach
    fun setUp() {
        coinEmergencyControlService.setKillSwitch(false, "테스트 초기화")

        user1 = userRepository.save(User(nickname = "유저1", kakaoId = "kakao_coin_1"))
        user2 = userRepository.save(User(nickname = "유저2", kakaoId = "kakao_coin_2"))
        adminUser = userRepository.save(User(nickname = "관리자", kakaoId = "kakao_coin_admin"))

        org.springframework.test.util.ReflectionTestUtils.setField(user1, "createdAt", LocalDateTime.of(2026, 9, 1, 0, 0))
        org.springframework.test.util.ReflectionTestUtils.setField(user2, "createdAt", LocalDateTime.of(2026, 9, 1, 0, 0))
        org.springframework.test.util.ReflectionTestUtils.setField(adminUser, "createdAt", LocalDateTime.of(2026, 9, 1, 0, 0))

        token1 = jwtTokenProvider.generateAccessToken(user1.id)
        token2 = jwtTokenProvider.generateAccessToken(user2.id)
        adminToken = jwtTokenProvider.generateAccessToken(adminUser.id)
    }

    @Test
    @DisplayName("본인 코인 잔액 및 거래 내역을 정상 조회할 수 있다")
    fun getMyBalanceAndTransactions() {
        // user1에게 20코인 지급
        coinTransactionService.grantCoins(
            userId = user1.id,
            challengeId = 10L,
            eligibleDates = setOf(LocalDate.of(2026, 10, 1), LocalDate.of(2026, 10, 2)),
            now = LocalDateTime.of(2026, 10, 11, 12, 0)
        )

        // 1. 잔액 조회
        mockMvc.get("/api/v1/coins/me/balance") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isOk() }
            jsonPath("$.userId") { value(user1.id) }
            jsonPath("$.availableBalance") { value(20) }
            jsonPath("$.heldBalance") { value(0) }
            jsonPath("$.totalBalance") { value(20) }
        }

        // 2. 거래 내역 조회
        mockMvc.get("/api/v1/coins/me/transactions") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
            jsonPath("$.content[0].userId") { value(user1.id) }
        }
    }

    @Test
    @DisplayName("IDOR 방어: 다른 사용자의 코인 잔액이나 내역을 조회하면 403 Forbidden을 반환한다")
    fun idorProtection() {
        // user1이 user2의 잔액 조회 시도 -> 403 Forbidden
        mockMvc.get("/api/v1/coins/users/${user2.id}/balance") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isForbidden() }
        }

        // user1이 user2의 거래 내역 조회 시도 -> 403 Forbidden
        mockMvc.get("/api/v1/coins/users/${user2.id}/transactions") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @DisplayName("F11 비상 통제: 긴급 킬스위치 설정 시 신규 지급은 HOLD 격리되며 관리자가 승인/반려할 수 있다")
    fun emergencyKillSwitchAndAdminReview() {
        // 1. 관리자가 킬스위치 활성화
        val killSwitchReq = KillSwitchRequest(active = true, reason = "긴급 점검으로 인한 지급 동결")
        mockMvc.post("/api/v1/admin/coins/kill-switch") {
            header("Authorization", "Bearer $adminToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(killSwitchReq)
        }.andExpect {
            status { isOk() }
            jsonPath("$.active") { value(true) }
        }

        // 2. 킬스위치 활성화 중 지급 시도 -> HOLD 상태로 저장
        val granted = coinTransactionService.grantCoins(
            userId = user1.id,
            challengeId = 20L,
            eligibleDates = setOf(LocalDate.of(2026, 10, 5)),
            now = LocalDateTime.of(2026, 10, 11, 14, 0)
        )
        assertThat(granted).hasSize(1)
        val heldTxId = granted[0].id

        // 3. 관리자 보류 목록 조회
        mockMvc.get("/api/v1/admin/coins/held") {
            header("Authorization", "Bearer $adminToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].id") { value(heldTxId) }
            jsonPath("$[0].type") { value("HOLD") }
        }

        // 4. 유저 잔액 확인: available=0, held=10
        val balanceBefore = coinTransactionService.getBalance(user1.id)
        assertThat(balanceBefore.availableBalance).isEqualTo(0)
        assertThat(balanceBefore.heldBalance).isEqualTo(10)

        // 5. 관리자가 보류 건 승인 (RELEASE)
        mockMvc.post("/api/v1/admin/coins/held/$heldTxId/approve") {
            header("Authorization", "Bearer $adminToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.type") { value("RELEASE") }
            jsonPath("$.status") { value("COMPLETED") }
        }

        // 6. 승인 후 유저 잔액: available=10, held=0
        val balanceAfter = coinTransactionService.getBalance(user1.id)
        assertThat(balanceAfter.availableBalance).isEqualTo(10)
        assertThat(balanceAfter.heldBalance).isEqualTo(0)
    }

    @Test
    @DisplayName("관리자 수동 차액 보정 API가 정상 동작하여 ADJUSTMENT_ADD / SUB가 원장에 반영된다")
    fun adminAdjustCoinsApi() {
        // 초기 10코인 지급
        coinTransactionService.grantCoins(
            userId = user1.id,
            challengeId = 30L,
            eligibleDates = setOf(LocalDate.of(2026, 10, 1)),
            now = LocalDateTime.of(2026, 10, 11, 12, 0)
        )

        // +10 보정
        val addReq = AdjustCoinRequest(
            targetDate = LocalDate.of(2026, 10, 2),
            adjustmentAmount = 10,
            challengeId = 30L,
            reason = "오류 인정 추가 보정"
        )
        mockMvc.post("/api/v1/admin/coins/users/${user1.id}/adjust") {
            header("Authorization", "Bearer $adminToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(addReq)
        }.andExpect {
            status { isOk() }
            jsonPath("$.type") { value("ADJUSTMENT_ADD") }
            jsonPath("$.amount") { value(10) }
            jsonPath("$.balanceAfter") { value(20) }
        }

        // -10 보정
        val subReq = AdjustCoinRequest(
            targetDate = LocalDate.of(2026, 10, 2),
            adjustmentAmount = -10,
            challengeId = 30L,
            reason = "중복 지급 회수"
        )
        mockMvc.post("/api/v1/admin/coins/users/${user1.id}/adjust") {
            header("Authorization", "Bearer $adminToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(subReq)
        }.andExpect {
            status { isOk() }
            jsonPath("$.type") { value("ADJUSTMENT_SUB") }
            jsonPath("$.amount") { value(10) }
            jsonPath("$.balanceAfter") { value(10) }
        }

        val balance = coinTransactionService.getBalance(user1.id)
        assertThat(balance.availableBalance).isEqualTo(10)
    }

    @Test
    @DisplayName("F06, 5.4: 결과 화면을 열지 않아도 챌린지 결과가 확정(CONFIRMED)되면 백그라운드에서 적격 코인이 자동 지급된다")
    fun autoGrantOnChallengeConfirmation() {
        val group = groupRepository.save(
            Group(name = "코인 자동 지급 모임", hostUserId = user1.id, inviteCode = "INVITE-COIN-1234")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = user1.id, role = GroupRole.MEMBER)
        )

        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 3)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user1.id,
                title = "3일 매일 챌린지",
                verificationCriteria = "인증 기준",
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL,
                startDate = startDate,
                endDate = endDate
            )
        )

        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user1.id,
                startDate = startDate,
                penaltyAmount = 1000
            )
        )

        // 3일 모두 정상 인증 제출
        listOf(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 2),
            LocalDate.of(2026, 10, 3)
        ).forEach { date ->
            val v = verificationRepository.save(
                Verification(
                    groupId = group.id,
                    challengeId = challenge.id,
                    userId = user1.id,
                    targetDate = date,
                    imageUrl = "https://dayuse.kr/cert.jpg"
                )
            )
            org.springframework.test.util.ReflectionTestUtils.setField(v, "createdAt", date.atTime(18, 0, 0))
        }

        // 결과 화면을 열지 않아도 스케줄러/배치 시각(운영 종료 후 최종 확정일시 도달: 10/4 09:00 KST)에 집계 실행
        val confirmationTime = LocalDateTime.of(2026, 10, 4, 9, 0, 1)
        challengeResultService.aggregateAndSave(challenge.id, confirmationTime)

        // user1에게 3일치 각 10코인 = 총 30코인이 백그라운드 자동 지급되어 잔액에 반영되어 있어야 함
        val balance = coinTransactionService.getBalance(user1.id)
        assertThat(balance.availableBalance).isEqualTo(30)
        assertThat(balance.heldBalance).isEqualTo(0)

        // 재호출되어도 멱등키에 의해 중복 지급되지 않음
        challengeResultService.aggregateAndSave(challenge.id, confirmationTime.plusHours(1))
        val balanceAfterSecond = coinTransactionService.getBalance(user1.id)
        assertThat(balanceAfterSecond.availableBalance).isEqualTo(30)
    }
}
