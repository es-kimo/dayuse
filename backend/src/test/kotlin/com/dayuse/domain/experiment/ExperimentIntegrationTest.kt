@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.experiment

import com.dayuse.domain.analytics.ProductEvent
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
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
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExperimentIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var experimentRepository: ExperimentRepository

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var user: User
    private lateinit var accessToken: String

    @BeforeEach
    fun setUp() {
        experimentRepository.deleteAll()
        productEventRepository.deleteAll()
        userRepository.deleteAll()

        user = userRepository.save(
            User(
                kakaoId = "kakao-exp-tester",
                nickname = "실험관리자",
                profileImageUrl = null
            )
        )
        accessToken = jwtTokenProvider.generateAccessToken(user.id)
    }

    @Test
    @DisplayName("Experiment 생성(DRAFT) -> 활성화(ACTIVE) -> 종료(STOPPED) 전 과정과 Fallback 응답, 과거 이벤트 보존을 검증한다")
    fun experimentLifecycleAndHistoricalEventPreservation() {
        val experimentKey = "challenge-invite-copy-v1"

        // 1. 미존재 실험 Fallback 조회 -> 200 OK + Control(A) + NOT_FOUND
        mockMvc.get("/api/v1/experiments/$experimentKey/fallback") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.participating") { value(false) }
            jsonPath("$.isFallback") { value(true) }
            jsonPath("$.fallbackReason") { value("NOT_FOUND") }
        }

        // 2. 실험 생성 (DRAFT)
        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                mapOf(
                    "experimentKey" to experimentKey,
                    "name" to "챌린지 초대 문구 A/B 실험 v1",
                    "rolloutPercentage" to 50,
                    "variantARatio" to 50,
                    "variantBRatio" to 50
                )
            )
        }.andExpect {
            status { isCreated() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.status") { value("DRAFT") }
            jsonPath("$.rolloutPercentage") { value(50) }
            jsonPath("$.variants[0]") { value("A") }
            jsonPath("$.variants[1]") { value("B") }
            jsonPath("$.variantRatio.a") { value(50) }
            jsonPath("$.variantRatio.b") { value(50) }
            jsonPath("$.startedAt") { doesNotExist() }
            jsonPath("$.endedAt") { doesNotExist() }
        }

        // 3. DRAFT 상태에서 Fallback 조회 -> INACTIVE_DRAFT
        mockMvc.get("/api/v1/experiments/$experimentKey/fallback") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("DRAFT") }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.participating") { value(false) }
            jsonPath("$.isFallback") { value(true) }
            jsonPath("$.fallbackReason") { value("INACTIVE_DRAFT") }
        }

        // 4. 실험 활성화 (DRAFT -> ACTIVE)
        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ACTIVE") }
            jsonPath("$.startedAt") { isNotEmpty() }
            jsonPath("$.endedAt") { doesNotExist() }
        }

        // 5. 활성 실험 중 수집된 ProductEvent 기록 시딩
        val recordedEvent = productEventRepository.save(
            ProductEvent.create(
                eventId = "evt-exp-history-1",
                eventName = "challenge_joined",
                occurredAt = DateTimeUtils.nowKst(),
                authenticatedUserId = user.id,
                sessionId = "session-exp-1",
                appVersion = "0.10.0",
                properties = mapOf("challengeId" to 10L)
            )
        )

        // 6. 실험 중단 (ACTIVE -> STOPPED)
        mockMvc.post("/api/v1/experiments/$experimentKey/stop") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("STOPPED") }
            jsonPath("$.startedAt") { isNotEmpty() }
            jsonPath("$.endedAt") { isNotEmpty() }
        }

        // 7. 중단(STOPPED) 후 신규 노출 즉시 중단 확인 (INACTIVE_STOPPED)
        mockMvc.get("/api/v1/experiments/$experimentKey/fallback") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("STOPPED") }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.participating") { value(false) }
            jsonPath("$.isFallback") { value(true) }
            jsonPath("$.fallbackReason") { value("INACTIVE_STOPPED") }
        }

        // 8. 실험 중단 후에도 기존에 수집된 ProductEvent 데이터가 삭제·수정 없이 보존되는지 검증
        val preservedEvent = productEventRepository.findByEventId(recordedEvent.eventId)
        assertNotNull(preservedEvent)
        assertEquals("challenge_joined", preservedEvent!!.eventName)
        assertEquals(user.id, preservedEvent.userId)
    }

    @Test
    @DisplayName("동일한 experimentKey로 중복 생성을 시도하면 409 Conflict를 반환한다")
    fun rejectDuplicateExperimentKey() {
        val payload = mapOf(
            "experimentKey" to "duplicate-key-test-v1",
            "name" to "중복 키 테스트",
            "rolloutPercentage" to 100
        )

        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isCreated() }
        }

        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isConflict() }
        }
    }

    @Test
    @DisplayName("종료된(STOPPED) 실험을 다시 활성화하거나 설정을 변경하려 하면 400 Bad Request를 반환한다")
    fun rejectReactivationOrMutationAfterStopped() {
        val experimentKey = "no-reactivate-v1"

        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                mapOf(
                    "experimentKey" to experimentKey,
                    "name" to "재활성화 금지 테스트",
                    "rolloutPercentage" to 50
                )
            )
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isOk() } }

        mockMvc.post("/api/v1/experiments/$experimentKey/stop") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isOk() } }

        // STOPPED -> ACTIVE 재활성화 차단
        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isBadRequest() } }

        // STOPPED 상태에서 rollout 변경 차단
        mockMvc.patch("/api/v1/experiments/$experimentKey/rollout") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(mapOf("rolloutPercentage" to 100))
        }.andExpect { status { isBadRequest() } }
    }
}
