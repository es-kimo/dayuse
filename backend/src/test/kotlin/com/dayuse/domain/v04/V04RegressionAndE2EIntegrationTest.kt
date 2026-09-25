@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v04

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.dto.RestartChallengeRequest
import com.dayuse.domain.challenge.period.ChallengePeriodSettlementRepository
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.service.PushSendResult
import com.dayuse.domain.notification.service.WebPushClient
import com.dayuse.domain.settlement.DepositReportRepository
import com.dayuse.domain.settlement.DepositReportStatus
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.share.ShareCard
import com.dayuse.domain.share.ShareCardRepository
import com.dayuse.domain.share.ShareCardType
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V04RegressionAndE2EIntegrationTest {

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
    private lateinit var challengePeriodSettlementRepository: ChallengePeriodSettlementRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    @Autowired
    private lateinit var shareCardRepository: ShareCardRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var settlementService: SettlementService

    @MockBean
    private lateinit var webPushClient: WebPushClient

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var outsiderUser: User

    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var outsiderToken: String

    private lateinit var group: Group
    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        Mockito.`when`(
            webPushClient.send(
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString()
            )
        ).thenReturn(PushSendResult(statusCode = 200, isSuccess = true, isExpired = false))

        hostUser = userRepository.save(User(nickname = "모임장호스트", kakaoId = "host_v04_${System.nanoTime()}"))
        memberUser = userRepository.save(User(nickname = "도전자멤버", kakaoId = "member_v04_${System.nanoTime()}"))
        outsiderUser = userRepository.save(User(nickname = "외부인", kakaoId = "outsider_v04_${System.nanoTime()}"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)
        outsiderToken = "Bearer " + jwtTokenProvider.generateAccessToken(outsiderUser.id)

        group = groupRepository.save(
            Group(
                name = "v0.4 브랜드 및 공개 정책 검증 모임",
                hostUserId = hostUser.id,
                inviteCode = "INVITEV04"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))
    }

    @Test
    @DisplayName("v0.4 시나리오 1: 공개 정책 및 메타데이터 보안 격리 검증 (BR-04, BR-05)")
    fun `공개 정책 및 메타데이터 보안 격리 검증`() {
        // Given: 챌린지 및 인증 생성
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "매일 아침 달리기",
                verificationCriteria = "달리기 앱 캡처",
                startDate = today.minusDays(3),
                endDate = today.plusDays(3),
                periodType = PeriodType.DAILY,
                targetFrequency = 1
            )
        )

        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = memberUser.id,
                penaltyAmount = 1_000,
                startDate = today.minusDays(3)
            )
        )

        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = memberUser.id,
                targetDate = today,
                imageUrl = "https://dayuse.kr/images/test-verify.jpg",
                comment = "오늘 5km 완주!"
            )
        )

        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today,
                status = DailyRecordStatus.COMPLETED,
                depositStatus = DepositStatus.UNPAID,
                verificationId = verification.id
            )
        )

        // When 1: 회원이 인증 공유 카드 생성
        val shareRes = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val shareToken = objectMapper.readTree(shareRes).get("token").asText()
        assertNotNull(shareToken)

        // Then 1: 비회원(인증 헤더 없음)의 공개 카드 조회 시 허용된 정보만 노출되고 모임/정산/개인정보는 은닉됨
        mockMvc.get("/api/v1/public/shares/$shareToken")
            .andExpect {
                status { isOk() }
                jsonPath("$.userNickname") { value("도전자멤버") }
                jsonPath("$.comment") { value("오늘 5km 완주!") }
                jsonPath("$.groupName") { doesNotExist() }
                jsonPath("$.accountNumber") { doesNotExist() }
                jsonPath("$.penaltyAmount") { doesNotExist() }
                jsonPath("$.kakaoId") { doesNotExist() }
            }

        // Then 2: 공개 공유 카드 OG 이미지 렌더링 엔드포인트 응답 검증
        mockMvc.get("/api/v1/public/shares/$shareToken/og.jpg")
            .andExpect {
                status { isOk() }
                header { string("Content-Type", "image/jpeg") }
            }

        // When 2: 작성자가 공유 카드를 해제(삭제)
        mockMvc.delete("/api/v1/shares/$shareToken") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isNoContent() }
        }

        // Then 3: 해제된 카드 또는 미존재 토큰 조회 시 404 Not Found로 철저히 격리
        mockMvc.get("/api/v1/public/shares/$shareToken")
            .andExpect {
                status { isNotFound() }
            }

        mockMvc.get("/api/v1/public/shares/non-existing-uuid-token")
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    @DisplayName("v0.4 시나리오 2: 비공개 모임·챌린지 IDOR 및 미인가 접근 차단 무결성 검증")
    fun `비공개 모임 및 챌린지 미인가 접근 차단 무결성 검증`() {
        // Given: 비공개 모임 계좌 등록
        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = GroupAccountRequest(
                bankName = "카카오뱅크",
                accountNumber = "3333-01-1234567",
                accountHolder = "모임장"
            )
        )

        // Then 1: 비회원(인증 헤더 없음)의 모임 내부 상세 조회 차단
        mockMvc.get("/api/v1/groups/${group.id}")
            .andExpect {
                status { isUnauthorized() }
            }

        // Then 2: 외부인(모임 미참여 회원)의 모임 내부 상세 조회 차단 (IDOR 방어)
        mockMvc.get("/api/v1/groups/${group.id}") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }

        // Then 3: 초대 코드로 모임 가입 시 정상 진입 확인
        mockMvc.post("/api/v1/invites/INVITEV04/join") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isOk() }
        }

        // 가입 후에는 정상 조회 가능
        mockMvc.get("/api/v1/groups/${group.id}") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isOk() }
        }
    }

    @Test
    @DisplayName("v0.4 시나리오 3: v0.1~v0.3 전 기능 하위 호환 종합 E2E 및 회귀 검증")
    fun `전 기능 하위 호환 종합 E2E 및 회귀 검증`() {
        // 1. 모임 계좌 설정
        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = GroupAccountRequest(
                bankName = "토스뱅크",
                accountNumber = "1000-00-999999",
                accountHolder = "정산담당"
            )
        )

        // 2. 주 3회 10일 가변 기간 챌린지 생성 및 개별 약정금 참가자 일괄 등록
        val createChallengeReq = CreateChallengeRequest(
            title = "v0.4 통합 챌린지 (주 3회)",
            verificationCriteria = "매일 운동 인증 사진",
            startDate = today,
            endDate = today.plusDays(9), // 10일
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            myPenaltyAmount = 3000,
            participants = listOf(
                CreateParticipantRequest(userId = memberUser.id, penaltyAmount = 2000)
            )
        )

        val challengeRes = mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(createChallengeReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val challengeId = objectMapper.readTree(challengeRes).get("id").asLong()
        assertTrue(challengeId > 0)

        // 3. 참여자 개별 약정금 설정 검증
        val participants = challengeParticipantRepository.findAllByChallengeId(challengeId)
        assertEquals(2, participants.size)
        val hostPart = participants.first { it.userId == hostUser.id }
        val memberPart = participants.first { it.userId == memberUser.id }
        assertEquals(3000, hostPart.penaltyAmount)
        assertEquals(2000, memberPart.penaltyAmount)

        // 4. 인증 등록 수행 (Member)
        val verifyRes = mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
            content = objectMapper.writeValueAsString(
                mapOf(
                    "challengeId" to challengeId,
                    "targetDate" to today.toString(),
                    "imageUrl" to "https://dayuse.kr/images/v04-e2e.png",
                    "comment" to "v0.4 통합 인증 성공"
                )
            )
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val verificationId = objectMapper.readTree(verifyRes).get("id").asLong()
        assertTrue(verificationId > 0)

        // 5. 챌린지 다시 시작 (Restart) 상속 및 독립 검증 (종료된 챌린지 대상)
        val endedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "10일 완성 주 3회 헬스 (시즌1)",
                description = "오운완",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(15),
                endDate = today.minusDays(1),
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = endedChallenge.id,
                userId = hostUser.id,
                penaltyAmount = 3000,
                startDate = today.minusDays(15)
            )
        )

        val restartReq = RestartChallengeRequest(
            title = "v0.4 챌린지 시즌2",
            verificationCriteria = "매일 운동 인증 사진 시즌2",
            startDate = today.plusDays(10),
            endDate = today.plusDays(19),
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3
        )
        val restartRes = mockMvc.post("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(restartReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val newChallengeId = objectMapper.readTree(restartRes).get("id").asLong()
        assertTrue(newChallengeId != endedChallenge.id)

        val newChallenge = challengeRepository.findById(newChallengeId).orElseThrow()
        assertEquals(PeriodType.WEEKLY_N, newChallenge.periodType)
        assertEquals(3, newChallenge.targetFrequency)
    }
}
