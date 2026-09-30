@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
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
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 이벤트 발생 → 수집 → 중복 방지 → 저장 → 집계·퍼널 조회까지의 전체 파이프라인 검증. (F06-2)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductEventAnalyticsIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var userC: User
    private lateinit var accessToken: String

    /** 조회 기간 경계 판정이 오늘 날짜에 흔들리지 않도록 기준일을 고정해 둔다. */
    private val day1: LocalDate = DateTimeUtils.todayKst().minusDays(2)
    private val day2: LocalDate = DateTimeUtils.todayKst().minusDays(1)

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        userRepository.deleteAll()

        userA = userRepository.save(User(kakaoId = "kakao-analytics-a", nickname = "집계유저A", profileImageUrl = null))
        userB = userRepository.save(User(kakaoId = "kakao-analytics-b", nickname = "집계유저B", profileImageUrl = null))
        userC = userRepository.save(User(kakaoId = "kakao-analytics-c", nickname = "집계유저C", profileImageUrl = null))
        accessToken = jwtTokenProvider.generateAccessToken(userA.id)
    }

    private fun tokenFor(user: User): String = jwtTokenProvider.generateAccessToken(user.id)

    private fun postEvent(
        user: User,
        eventId: String,
        eventName: String,
        occurredAt: LocalDateTime,
        properties: Map<String, Any?> = emptyMap()
    ): Int {
        val payload = mapOf(
            "eventId" to eventId,
            "eventName" to eventName,
            "occurredAt" to occurredAt.toString(),
            "sessionId" to "session-${user.id}",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0",
            "properties" to properties
        )
        return mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer ${tokenFor(user)}")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andReturn().response.status
    }

    /**
     * userA: 인증 시작 3회(같은 행동 반복) + 인증 완료 1회
     * userB: 인증 시작 1회 + 인증 완료 1회
     * userC: 인증 시작 1회만 (이탈)
     */
    private fun seedCertificationFunnel() {
        postEvent(userA, "evt-a-start-1", "certification_started", day1.atTime(9, 0), mapOf("challengeId" to 1))
        postEvent(userA, "evt-a-start-2", "certification_started", day1.atTime(9, 30), mapOf("challengeId" to 1))
        postEvent(userA, "evt-a-start-3", "certification_started", day2.atTime(9, 0), mapOf("challengeId" to 1))
        postEvent(userA, "evt-a-done-1", "certification_completed", day2.atTime(9, 5), mapOf("challengeId" to 1))

        postEvent(userB, "evt-b-start-1", "certification_started", day1.atTime(11, 0), mapOf("challengeId" to 2))
        postEvent(userB, "evt-b-done-1", "certification_completed", day1.atTime(11, 10), mapOf("challengeId" to 2))

        postEvent(userC, "evt-c-start-1", "certification_started", day2.atTime(20, 0), mapOf("challengeId" to 3))
    }

    @Test
    @DisplayName("기간별 전체 이벤트 수와 고유 사용자 수를 구분해 집계하고, eventName별·일자별로 나눠 돌려준다")
    fun aggregatesTotalsUniqueUsersBreakdownAndDailyTrend() {
        seedCertificationFunnel()

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
        }.andExpect {
            status { isOk() }
            // 전체 7건, 고유 사용자 3명. 같은 사용자의 반복 행동이 사용자 수를 부풀리지 않는다.
            jsonPath("$.totalEvents") { value(7) }
            jsonPath("$.uniqueUsers") { value(3) }
            jsonPath("$.period.days") { value(2) }

            jsonPath("$.byEventName[0].eventName") { value("certification_started") }
            jsonPath("$.byEventName[0].events") { value(5) }
            jsonPath("$.byEventName[0].users") { value(3) }
            jsonPath("$.byEventName[1].eventName") { value("certification_completed") }
            jsonPath("$.byEventName[1].events") { value(2) }
            jsonPath("$.byEventName[1].users") { value(2) }

            jsonPath("$.dailyTrend.length()") { value(2) }
            jsonPath("$.dailyTrend[0].date") { value(day1.toString()) }
            jsonPath("$.dailyTrend[0].events") { value(4) }
            jsonPath("$.dailyTrend[0].users") { value(2) }
            jsonPath("$.dailyTrend[1].date") { value(day2.toString()) }
            jsonPath("$.dailyTrend[1].events") { value(3) }
            jsonPath("$.dailyTrend[1].users") { value(2) }
        }
    }

    @Test
    @DisplayName("eventName 필터를 주면 그 이벤트만 집계한다")
    fun filtersByEventName() {
        seedCertificationFunnel()

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
            param("eventName", "certification_completed")
        }.andExpect {
            status { isOk() }
            jsonPath("$.eventName") { value("certification_completed") }
            jsonPath("$.totalEvents") { value(2) }
            jsonPath("$.uniqueUsers") { value(2) }
            jsonPath("$.byEventName.length()") { value(1) }
        }
    }

    @Test
    @DisplayName("조회 기간 밖의 이벤트는 집계에 섞이지 않는다")
    fun excludesEventsOutsideThePeriod() {
        seedCertificationFunnel()

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day2.toString())
            param("endDate", day2.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalEvents") { value(3) }
            jsonPath("$.uniqueUsers") { value(2) }
        }
    }

    @Test
    @DisplayName("인증 시작 → 인증 완료 퍼널의 단계별 도달 사용자 수와 전환율을 조회한다")
    fun returnsCertificationFunnel() {
        seedCertificationFunnel()

        mockMvc.get("/api/v1/analytics/product-events/funnel") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$.funnel") { value("certification") }
            jsonPath("$.steps.length()") { value(2) }
            jsonPath("$.steps[0].eventName") { value("certification_started") }
            jsonPath("$.steps[0].reachedUsers") { value(3) }
            jsonPath("$.steps[1].eventName") { value("certification_completed") }
            jsonPath("$.steps[1].reachedUsers") { value(2) }
            jsonPath("$.steps[1].stepConversionRate") { value(66.67) }
            jsonPath("$.overallConversionRate") { value(66.67) }
        }
    }

    @Test
    @DisplayName("퍼널 단계를 직접 지정할 수 있고, 표준 이벤트가 아니면 400으로 거부한다")
    fun acceptsExplicitFunnelStepsAndRejectsUnknownEvent() {
        seedCertificationFunnel()

        mockMvc.get("/api/v1/analytics/product-events/funnel") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
            param("steps", "certification_started", "certification_completed")
        }.andExpect {
            status { isOk() }
            jsonPath("$.funnel") { value(null as String?) }
            jsonPath("$.steps[1].reachedUsers") { value(2) }
        }

        mockMvc.get("/api/v1/analytics/product-events/funnel") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
            param("steps", "certification_started", "not_a_real_event")
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    @DisplayName("동일 eventId를 재전송해도 집계 수치가 부풀려지지 않는다")
    fun duplicateEventIdDoesNotInflateAggregates() {
        postEvent(userA, "evt-dup-1", "certification_started", day1.atTime(9, 0))
        repeat(4) {
            val status = postEvent(userA, "evt-dup-1", "certification_started", day1.atTime(9, 0))
            assertEquals(200, status, "중복 전송은 200 멱등 응답이어야 한다")
        }

        assertEquals(1L, productEventRepository.count())

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day1.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalEvents") { value(1) }
            jsonPath("$.uniqueUsers") { value(1) }
        }
    }

    @Test
    @DisplayName("사진 URL·댓글·계좌번호 등 금지 데이터는 저장 단계에서 막혀 집계 대상에 남지 않는다")
    fun sensitivePropertiesNeverReachStoredEvents() {
        val forbiddenPayloads = listOf(
            mapOf("challengeId" to 1, "imageUrl" to "https://cdn.dayuse.kr/verifications/1.png"),
            mapOf("challengeId" to 1, "comment" to "오늘도 성공!"),
            mapOf("challengeId" to 1, "accountNumber" to "110-123-456789"),
            mapOf("challengeId" to 1, "nickname" to "홍길동"),
            mapOf("challengeId" to 1, "photo" to "s3://dayuse/verifications/1.png")
        )

        forbiddenPayloads.forEachIndexed { index, properties ->
            val status = postEvent(
                user = userA,
                eventId = "evt-forbidden-$index",
                eventName = "certification_completed",
                occurredAt = day1.atTime(9, 0),
                properties = properties
            )
            assertEquals(400, status, "금지 키가 포함된 이벤트는 400으로 거부되어야 한다: $properties")
        }

        assertEquals(0L, productEventRepository.count())

        // 허용 문맥(내부 식별자)만 담긴 이벤트는 정상 저장되고, 저장된 값에도 금지 키가 없다.
        assertEquals(
            201,
            postEvent(userA, "evt-clean-1", "certification_completed", day1.atTime(9, 0), mapOf("challengeId" to 7, "groupId" to 3))
        )

        val forbiddenKeys = setOf("imageurl", "photo", "comment", "accountnumber", "nickname", "userid")
        productEventRepository.findAll().forEach { event ->
            val normalizedKeys = event.properties.keys.map { it.lowercase().replace("_", "").replace("-", "") }
            assertTrue(
                normalizedKeys.none { it in forbiddenKeys },
                "저장된 이벤트에 금지 키가 남아 있다: ${event.properties.keys}"
            )
            assertTrue(
                event.properties.values.none { it is String && (it.startsWith("http") || it.startsWith("s3://")) },
                "저장된 이벤트 값에 외부 URL이 남아 있다: ${event.properties}"
            )
        }
    }

    @Test
    @DisplayName("조회 기간이 최대 허용치를 넘으면 400으로 거부해 전체 풀스캔을 막는다")
    fun rejectsTooLongPeriod() {
        val today = DateTimeUtils.todayKst()

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", today.minusDays(ProductEventPeriod.MAX_DAYS).toString())
            param("endDate", today.toString())
        }.andExpect { status { isBadRequest() } }
    }

    @Test
    @DisplayName("인증 없이는 집계·퍼널을 조회할 수 없다")
    fun requiresAuthentication() {
        mockMvc.get("/api/v1/analytics/product-events/summary").andExpect { status { isUnauthorized() } }
        mockMvc.get("/api/v1/analytics/product-events/funnel").andExpect { status { isUnauthorized() } }
    }

    @Test
    @DisplayName("이벤트가 하나도 없는 날도 추이에서 0으로 채워 내려준다")
    fun fillsDaysWithoutEvents() {
        postEvent(userA, "evt-only-1", "home_viewed", day2.atTime(8, 0))

        mockMvc.get("/api/v1/analytics/product-events/summary") {
            header("Authorization", "Bearer $accessToken")
            param("startDate", day1.toString())
            param("endDate", day2.toString())
        }.andExpect {
            status { isOk() }
            jsonPath("$.dailyTrend.length()") { value(2) }
            jsonPath("$.dailyTrend[0].events") { value(0) }
            jsonPath("$.dailyTrend[0].users") { value(0) }
            jsonPath("$.dailyTrend[1].events") { value(1) }
        }
    }
}
