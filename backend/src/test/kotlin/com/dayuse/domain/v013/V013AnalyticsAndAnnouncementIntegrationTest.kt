@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v013

import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.service.ChallengeAnalyticsRecorder
import com.dayuse.domain.analytics.service.ProductEventService
import com.dayuse.domain.announcement.AnnouncementActionTarget
import com.dayuse.domain.announcement.AnnouncementDataSeeder
import com.dayuse.domain.announcement.AnnouncementRepository
import com.dayuse.domain.announcement.AnnouncementStatus
import com.dayuse.domain.announcement.dto.AnnouncementPublishRequest
import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.service.AnnouncementService
import com.dayuse.domain.coin.CoinBalance
import com.dayuse.domain.coin.CoinBalanceRepository
import com.dayuse.domain.coin.CoinTransactionRepository
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
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
@DisplayName("v0.13 분석 이벤트·원장 지표 집계·새소식 런칭 파이프라인 통합 테스트 (F09~F10)")
class V013AnalyticsAndAnnouncementIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var productEventService: ProductEventService

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var challengeAnalyticsRecorder: ChallengeAnalyticsRecorder

    @Autowired
    private lateinit var coinTransactionService: CoinTransactionService

    @Autowired
    private lateinit var coinBalanceRepository: CoinBalanceRepository

    @Autowired
    private lateinit var coinTransactionRepository: CoinTransactionRepository

    @Autowired
    private lateinit var announcementService: AnnouncementService

    @Autowired
    private lateinit var announcementRepository: AnnouncementRepository

    @Autowired
    private lateinit var announcementDataSeeder: AnnouncementDataSeeder

    private lateinit var testUser: User
    private lateinit var userToken: String
    private lateinit var adminUser: User
    private lateinit var adminToken: String

    @BeforeEach
    fun setUp() {
        testUser = userRepository.save(
            User(
                kakaoId = "kakao_v013_user",
                nickname = "도전러"
            )
        )
        userToken = jwtTokenProvider.generateAccessToken(testUser.id)

        adminUser = userRepository.save(
            User(
                kakaoId = "kakao_v013_admin",
                nickname = "운영자"
            )
        )
        adminToken = jwtTokenProvider.generateAccessToken(adminUser.id)
    }

    @Test
    @DisplayName("F09: 6종 핵심 분석 이벤트가 정상 등록되고, 중복 전송 시 멱등하게 무시된다")
    fun testSixCoreAnalyticsEventsAndIdempotency() {
        val now = DateTimeUtils.nowKst()
        val today = DateTimeUtils.todayKst()

        // 1. challenge_result_notice_viewed (클라이언트 이벤트)
        val noticeResult = productEventService.recordEventSafely(
            authenticatedUserId = testUser.id,
            request = ProductEventCreateRequest(
                eventId = "notice-viewed-test-01",
                eventName = ProductEventName.CHALLENGE_RESULT_NOTICE_VIEWED.value,
                occurredAt = now.toString(),
                sessionId = "sess-01",
                appVersion = "1.0.0",
                properties = mapOf("unacknowledgedCount" to 2)
            )
        )
        assertThat(noticeResult.status).isEqualTo("recorded")

        // 2. challenge_result_viewed (클라이언트 이벤트)
        val viewedResult = productEventService.recordEventSafely(
            authenticatedUserId = testUser.id,
            request = ProductEventCreateRequest(
                eventId = "result-viewed-test-01",
                eventName = ProductEventName.CHALLENGE_RESULT_VIEWED.value,
                occurredAt = now.toString(),
                sessionId = "sess-01",
                appVersion = "1.0.0",
                properties = mapOf(
                    "challengeId" to 101L,
                    "groupId" to 10L,
                    "status" to "CONFIRMED",
                    "isSuccess" to true,
                    "achievementRate" to 100,
                    "coinGrantStatus" to "GRANTED",
                    "coinRewardCount" to 70
                )
            )
        )
        assertThat(viewedResult.status).isEqualTo("recorded")

        // 3. challenge_result_action_clicked (클라이언트 이벤트)
        val actionResult = productEventService.recordEventSafely(
            authenticatedUserId = testUser.id,
            request = ProductEventCreateRequest(
                eventId = "action-clicked-test-01",
                eventName = ProductEventName.CHALLENGE_RESULT_ACTION_CLICKED.value,
                occurredAt = now.toString(),
                sessionId = "sess-01",
                appVersion = "1.0.0",
                properties = mapOf(
                    "challengeId" to 101L,
                    "groupId" to 10L,
                    "action" to "VIEW_COIN",
                    "destinationPath" to "/coins"
                )
            )
        )
        assertThat(actionResult.status).isEqualTo("recorded")

        // 4. challenge_result_acknowledged (서버 적재기)
        challengeAnalyticsRecorder.challengeResultAcknowledged(
            userId = testUser.id,
            challengeId = 101L,
            groupId = 10L,
            revision = 1,
            lateCount = 0,
            coinRewardCount = 70,
            coinGrantStatus = "GRANTED"
        )

        // 5. challenge_coin_granted (서버 적재기)
        challengeAnalyticsRecorder.challengeCoinGranted(
            userId = testUser.id,
            challengeId = 101L,
            amount = 10,
            targetDate = today
        )

        // 6. challenge_coin_adjusted (서버 적재기)
        challengeAnalyticsRecorder.challengeCoinAdjusted(
            userId = testUser.id,
            challengeId = 101L,
            transactionId = 999L,
            amount = 10,
            targetDate = today,
            type = "ADJUSTMENT_ADD",
            balanceAfter = 80
        )

        // 동일 서버 이벤트 중복 호출 시 멱등 방어 검증 (행 증가 없이 안전 무시)
        val countBefore = productEventRepository.findAll().count { it.userId == testUser.id }
        challengeAnalyticsRecorder.challengeCoinGranted(
            userId = testUser.id,
            challengeId = 101L,
            amount = 10,
            targetDate = today
        )
        val countAfter = productEventRepository.findAll().count { it.userId == testUser.id }
        assertThat(countAfter).isEqualTo(countBefore)
    }

    @Test
    @DisplayName("F09: 원장 기반 발행·보정·차감 집계 및 상품별(티셔츠 3,600 / 후디 7,200) 목표액 도달자 수 조회")
    fun testLedgerMetricsAndGoalReachedAccounts() {
        val today = DateTimeUtils.todayKst()

        // 사용자 1: 3,700 코인 보유 (티셔츠 3,600 도달, 후디 7,200 미도달)
        val user1 = userRepository.save(User(nickname = "티셔츠도달자", kakaoId = "kakao_goal_1"))
        coinBalanceRepository.save(CoinBalance(userId = user1.id, availableBalance = 3700))
        coinTransactionService.grantCoins(user1.id, 1L, setOf(today))

        // 사용자 2: 7,500 코인 보유 (티셔츠 3,600 및 후디 7,200 모두 도달)
        val user2 = userRepository.save(User(nickname = "후디도달자", kakaoId = "kakao_goal_2"))
        coinBalanceRepository.save(CoinBalance(userId = user2.id, availableBalance = 7500))

        // 사용자 3: 500 코인 보유 (둘 다 미도달)
        val user3 = userRepository.save(User(nickname = "일반유저", kakaoId = "kakao_goal_3"))
        coinBalanceRepository.save(CoinBalance(userId = user3.id, availableBalance = 500))

        // 관리자 원장 지표 조회 API 호출
        val response = mockMvc.get("/api/v1/admin/coins/metrics") {
            header("Authorization", "Bearer $adminToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.tshirtGoalTarget") { value(3600) }
            jsonPath("$.hoodieGoalTarget") { value(7200) }
        }.andReturn().response.contentAsString

        val metrics = objectMapper.readTree(response)
        assertThat(metrics.get("tshirtGoalReachedUsers").asLong()).isGreaterThanOrEqualTo(2L) // user1, user2
        assertThat(metrics.get("hoodieGoalReachedUsers").asLong()).isGreaterThanOrEqualTo(1L) // user2
        assertThat(metrics.get("totalAccounts").asLong()).isGreaterThanOrEqualTo(3L)
    }

    @Test
    @DisplayName("F10: v0.13 코인 런칭 새소식 콘텐츠가 기본 시드되고, CTA 목적지가 /coins로 연결된다")
    fun testAnnouncementSeedAndCtaDestination() {
        // 데이터 시더 실행
        announcementDataSeeder.seed()

        val announcement = announcementRepository.findAll().firstOrNull {
            it.title == "끝낸 챌린지, 결과와 코인으로 돌아봐요"
        }

        assertThat(announcement).isNotNull
        assertThat(announcement!!.summary).contains("챌린지가 끝나면 내 실천을 돌아보고 코인을 받아요")
        assertThat(announcement.ctaLabel).isEqualTo("내 코인 보기")
        assertThat(announcement.ctaTarget).isEqualTo(AnnouncementActionTarget.COIN_BALANCE)
        assertThat(announcement.status).isEqualTo(AnnouncementStatus.PUBLISHED)
        assertThat(announcement.homeVisible).isTrue()

        // 일반 사용자 소식 목록에서 조회 가능 확인
        mockMvc.get("/api/v1/announcements") {
            header("Authorization", "Bearer $userToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$[?(@.title == '끝낸 챌린지, 결과와 코인으로 돌아봐요')].ctaLabel") {
                value("내 코인 보기")
            }
            jsonPath("$[?(@.title == '끝낸 챌린지, 결과와 코인으로 돌아봐요')].ctaTarget") {
                value("COIN_BALANCE")
            }
        }
    }

    @Test
    @DisplayName("F10: 새소식 운영 파이프라인: 초안(DRAFT) 작성 → 미리보기 → 게시(PUBLISHED) → 일반 노출")
    fun testAnnouncementEditorialPipeline() {
        val now = DateTimeUtils.nowKst()

        // 1. 초안 작성
        val draft = announcementService.createDraft(
            actorId = adminUser.id,
            request = AnnouncementUpsertRequest(
                title = "파이프라인 테스트 소식",
                summary = "새로운 보상 오픈",
                body = "코인으로 굿즈를 받아보세요.",
                ctaLabel = "내 코인 보기",
                ctaTarget = AnnouncementActionTarget.COIN_BALANCE,
                homeVisible = true
            ),
            now = now
        )
        assertThat(draft.status).isEqualTo(AnnouncementStatus.DRAFT)

        // 초안 상태에서는 일반 사용자가 조회할 수 없음
        mockMvc.get("/api/v1/announcements/${draft.id}") {
            header("Authorization", "Bearer $userToken")
        }.andExpect {
            status { isNotFound() }
        }

        // 2. 관리자 미리보기 (관리자 권한 조회)
        mockMvc.get("/api/v1/admin/announcements/${draft.id}") {
            header("Authorization", "Bearer $adminToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.ctaTarget") { value("COIN_BALANCE") }
            jsonPath("$.ctaPath") { value("/coins") }
        }

        // 3. 실제 게시 전환 (PUBLISHED)
        announcementService.publishAnnouncement(
            actorId = adminUser.id,
            announcementId = draft.id,
            request = AnnouncementPublishRequest(publishAt = now.minusHours(1)),
            now = now
        )

        // 4. 일반 사용자 정상 조회 확인
        mockMvc.get("/api/v1/announcements/${draft.id}") {
            header("Authorization", "Bearer $userToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.ctaLabel") { value("내 코인 보기") }
            jsonPath("$.ctaTarget") { value("COIN_BALANCE") }
        }
    }
}
