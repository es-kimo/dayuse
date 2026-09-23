@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.share

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
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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
import org.springframework.transaction.annotation.Transactional
import java.io.ByteArrayInputStream
import java.time.LocalDate
import javax.imageio.ImageIO

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ShareCardIntegrationTest {

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
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var shareCardRepository: ShareCardRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var user1: User
    private lateinit var user2: User
    private lateinit var token1: String
    private lateinit var token2: String
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var participant1: ChallengeParticipant
    private lateinit var verification: Verification

    @BeforeEach
    fun setUp() {
        user1 = userRepository.save(User(kakaoId = "kakao-share-1", nickname = "공유러너"))
        user2 = userRepository.save(User(kakaoId = "kakao-share-2", nickname = "타인유저"))
        token1 = jwtTokenProvider.generateAccessToken(user1.id)
        token2 = jwtTokenProvider.generateAccessToken(user2.id)

        group = groupRepository.save(
            Group(
                name = "미라클모닝 1기",
                hostUserId = user1.id,
                inviteCode = "SHAREINV123"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user1.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user2.id, role = GroupRole.MEMBER))

        val today = DateTimeUtils.todayKst()
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user1.id,
                title = "매일 아침 6시 기상",
                description = "일찍 일어나자",
                verificationCriteria = "시계 사진",
                startDate = today.minusDays(5),
                endDate = today.plusDays(5)
            )
        )

        participant1 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user1.id,
                penaltyAmount = 5000,
                startDate = challenge.startDate
            )
        )

        verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = user1.id,
                targetDate = today,
                imageUrl = "challenges/${challenge.id}/verifications/${user1.id}/photo.jpg",
                comment = "오늘도 완료!"
            )
        )
    }

    @Test
    @DisplayName("인증 공유 카드 생성 및 외부 비인가 단건 조회 성공 (민감 정보 격리)")
    fun createAndGetVerificationShareCard() {
        // 1. 공유 카드 생성 및 토큰 발급
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
            jsonPath("$.token") { exists() }
            jsonPath("$.cardType") { value("TODAY_VERIFICATION") }
            jsonPath("$.title") { value("매일 아침 6시 기상") }
            jsonPath("$.userNickname") { value("공유러너") }
            jsonPath("$.comment") { value("오늘도 완료!") }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // 2. 외부 비인가 조회 (인증 헤더 없음)
        mockMvc.get("/api/v1/public/shares/$shareToken") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.token") { value(shareToken) }
            jsonPath("$.cardType") { value("TODAY_VERIFICATION") }
            jsonPath("$.title") { value("매일 아침 6시 기상") }
            jsonPath("$.userNickname") { value("공유러너") }
            jsonPath("$.comment") { value("오늘도 완료!") }
            // 민감 정보 격리 검증: 모임명, 그룹ID, 계좌, 벌금 등이 응답에 없어야 함
            jsonPath("$.groupId") { doesNotExist() }
            jsonPath("$.groupName") { doesNotExist() }
            jsonPath("$.penaltyAmount") { doesNotExist() }
            jsonPath("$.accountNumber") { doesNotExist() }
        }
    }

    @Test
    @DisplayName("타인의 인증으로 공유 카드를 생성하려고 하면 403 Forbidden")
    fun cannotCreateShareForOtherUserVerification() {
        mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token2")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @DisplayName("연속 기록 공유 카드 생성 및 스트릭 조회 성공")
    fun createStreakShareCard() {
        val today = DateTimeUtils.todayKst()
        // 3일 연속 완료 레코드 생성
        dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = participant1.id, userId = user1.id, date = today, status = DailyRecordStatus.COMPLETED))
        dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = participant1.id, userId = user1.id, date = today.minusDays(1), status = DailyRecordStatus.COMPLETED))
        dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = participant1.id, userId = user1.id, date = today.minusDays(2), status = DailyRecordStatus.COMPLETED))

        val result = mockMvc.post("/api/v1/shares/challenges/${challenge.id}/streak") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
            jsonPath("$.token") { exists() }
            jsonPath("$.cardType") { value("STREAK") }
            jsonPath("$.streakDays") { value(3) }
            jsonPath("$.historyJson") { exists() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // 외부 공개 조회
        mockMvc.get("/api/v1/public/shares/$shareToken") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.cardType") { value("STREAK") }
            jsonPath("$.streakDays") { value(3) }
        }
    }

    @Test
    @DisplayName("타인의 공유 카드를 해제(삭제)하려고 하면 403 Forbidden")
    fun cannotDeactivateOtherUserShareCard() {
        // user1의 공유 카드 생성
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // user2가 해제 시도
        mockMvc.delete("/api/v1/shares/$shareToken") {
            header("Authorization", "Bearer $token2")
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @DisplayName("작성자가 공유 카드를 해제하면 외부 조회가 즉시 404 Not Found로 차단된다")
    fun deactivateShareCardBlocksPublicAccess() {
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // 해제
        mockMvc.delete("/api/v1/shares/$shareToken") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isNoContent() }
        }

        // 비인가 공개 조회 시 404
        mockMvc.get("/api/v1/public/shares/$shareToken") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    @DisplayName("원본 인증 삭제 시 연동된 공유 카드가 비활성화되어 공개 조회가 404로 차단된다")
    fun verificationDeletionDeactivatesShareCard() {
        // 공유 카드 생성
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // 원본 인증 삭제
        mockMvc.delete("/api/v1/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isNoContent() }
        }

        // 비인가 공개 조회 시 404
        mockMvc.get("/api/v1/public/shares/$shareToken") {
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isNotFound() }
        }
    }

    @Test
    @DisplayName("공유 카드 OG 이미지는 비인가로 열리고 CDN이 받아낼 캐시 헤더가 붙는다")
    fun publicShareOgImageIsServedWithCdnCacheHeader() {
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        // 인증 헤더 없이(크롤러처럼) 접근한다.
        val image = mockMvc.get("/api/v1/public/shares/$shareToken/og.jpg")
            .andExpect {
                status { isOk() }
                content { contentType(MediaType.IMAGE_JPEG) }
                header { string("Cache-Control", "max-age=86400, public") }
            }.andReturn().response.contentAsByteArray

        // 프리뷰로 쓸 수 있는 규격이어야 한다.
        val decoded = ImageIO.read(ByteArrayInputStream(image))
        assertEquals(1200, decoded.width)
        assertEquals(630, decoded.height)
    }

    @Test
    @DisplayName("공유 카드를 해제하면 OG 이미지도 즉시 404로 차단된다")
    fun deactivateShareCardBlocksOgImage() {
        val result = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            header("Authorization", "Bearer $token1")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isCreated() }
        }.andReturn()

        val shareToken = objectMapper.readTree(result.response.contentAsString).get("token").asText()

        mockMvc.delete("/api/v1/shares/$shareToken") {
            header("Authorization", "Bearer $token1")
        }.andExpect {
            status { isNoContent() }
        }

        mockMvc.get("/api/v1/public/shares/$shareToken/og.jpg").andExpect {
            status { isNotFound() }
        }
    }

    @Test
    @DisplayName("없는 토큰의 OG 이미지는 404")
    fun unknownTokenOgImageReturnsNotFound() {
        mockMvc.get("/api/v1/public/shares/does-not-exist/og.jpg").andExpect {
            status { isNotFound() }
        }
    }
}
