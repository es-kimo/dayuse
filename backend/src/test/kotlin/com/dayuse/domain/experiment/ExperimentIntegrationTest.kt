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

    @Test
    @DisplayName("사용자 Variant 배정 API는 반복 호출 시 항상 동일한 결과를 반환하며 비활성/미존재 시 안전하게 Control(A)을 반환한다")
    fun deterministicAssignmentApiAndActiveAssignmentsList() {
        val experimentKey = "challenge-invite-copy-v1"

        // 1. 미존재 상태에서 assignment 조회 -> participating=false, variant=A, fallbackReason=NOT_FOUND
        mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.userId") { value(user.id) }
            jsonPath("$.participating") { value(false) }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.isFallback") { value(true) }
            jsonPath("$.fallbackReason") { value("NOT_FOUND") }
        }

        // 2. 실험 생성 (DRAFT) 및 활성화 (ACTIVE, rollout 100%)
        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                mapOf(
                    "experimentKey" to experimentKey,
                    "name" to "배정 일관성 검증 실험",
                    "rolloutPercentage" to 100,
                    "variantARatio" to 50,
                    "variantBRatio" to 50
                )
            )
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isOk() } }

        // 3. ACTIVE 상태에서 반복 조회 시 항상 동일한 결과 반환
        val firstResponse = mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.status") { value("ACTIVE") }
            jsonPath("$.participating") { value(true) }
            jsonPath("$.isFallback") { value(false) }
            jsonPath("$.fallbackReason") { value("NONE") }
        }.andReturn().response.contentAsString

        val secondResponse = mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
        }.andReturn().response.contentAsString

        assertEquals(firstResponse, secondResponse)

        // 4. 활성 실험 전체 배정 목록 조회
        mockMvc.get("/api/v1/experiments/assignments") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].experimentKey") { value(experimentKey) }
            jsonPath("$[0].participating") { value(true) }
        }

        // 5. 실험 중단(STOPPED) 후 배정 조회 -> 즉시 participating=false, variant=A로 전환
        mockMvc.post("/api/v1/experiments/$experimentKey/stop") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isOk() } }

        mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("STOPPED") }
            jsonPath("$.participating") { value(false) }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.isFallback") { value(true) }
            jsonPath("$.fallbackReason") { value("INACTIVE_STOPPED") }
        }
    }

    @Test
    @DisplayName("Variant별 Exposure · Conversion · CVR 결과 조회 API가 반복 노출/전환 및 비노출 사용자를 정확히 구분해 집계한다")
    fun comparesVariantExposureConversionAndCvrViaApi() {
        val experimentKey = "challenge-invite-copy-v1"
        val userA1 = user
        val userA2 = userRepository.save(User(kakaoId = "kakao-exp-a2", nickname = "실험유저A2", profileImageUrl = null))
        val userB1 = userRepository.save(User(kakaoId = "kakao-exp-b1", nickname = "실험유저B1", profileImageUrl = null))
        val userB2 = userRepository.save(User(kakaoId = "kakao-exp-b2", nickname = "실험유저B2", profileImageUrl = null))
        val unexposedUser = userRepository.save(User(kakaoId = "kakao-exp-unexp", nickname = "비노출유저", profileImageUrl = null))

        // 실험 생성 및 활성화
        mockMvc.post("/api/v1/experiments") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                mapOf(
                    "experimentKey" to experimentKey,
                    "name" to "초대 문구 실험 결과 비교",
                    "rolloutPercentage" to 100,
                    "variantARatio" to 50,
                    "variantBRatio" to 50
                )
            )
        }.andExpect { status { isCreated() } }

        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $accessToken")
        }.andExpect { status { isOk() } }

        val t0 = DateTimeUtils.nowKst().minusMinutes(30)

        fun recordEvent(
            actor: User,
            eventId: String,
            eventName: String,
            occurredAtOffsetMinutes: Long,
            properties: Map<String, Any?>
        ) {
            val token = jwtTokenProvider.generateAccessToken(actor.id)
            mockMvc.post("/api/v1/events") {
                header("Authorization", "Bearer $token")
                contentType = MediaType.APPLICATION_JSON
                content = objectMapper.writeValueAsString(
                    mapOf(
                        "eventId" to eventId,
                        "eventName" to eventName,
                        "occurredAt" to t0.plusMinutes(occurredAtOffsetMinutes).toString(),
                        "sessionId" to "sess-${actor.id}",
                        "schemaVersion" to 1,
                        "appVersion" to "0.10.0",
                        "properties" to properties
                    )
                )
            }.andExpect { status { isCreated() } }
        }

        // Variant A: userA1 (노출 2회 + 전환 1회), userA2 (노출 1회, 전환 없음) => exposedUsers=2, convertedUsers=1, CVR=50.0%
        recordEvent(userA1, "exp-a1-1", "experiment_exposed", 1, mapOf("experimentKey" to experimentKey, "variant" to "A"))
        recordEvent(userA1, "exp-a1-2", "experiment_exposed", 2, mapOf("experimentKey" to experimentKey, "variant" to "A"))
        recordEvent(
            userA1,
            "conv-a1-1",
            "challenge_joined",
            5,
            mapOf(
                "challengeId" to 10,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "A")
            )
        )
        recordEvent(userA2, "exp-a2-1", "experiment_exposed", 3, mapOf("experimentKey" to experimentKey, "variant" to "A"))

        // Variant B: userB1 (노출 3회 + 전환 2회), userB2 (노출 1회 + 전환 1회) => exposedUsers=2, convertedUsers=2, CVR=100.0%
        recordEvent(userB1, "exp-b1-1", "experiment_exposed", 1, mapOf("experimentKey" to experimentKey, "variant" to "B"))
        recordEvent(userB1, "exp-b1-2", "experiment_exposed", 2, mapOf("experimentKey" to experimentKey, "variant" to "B"))
        recordEvent(userB1, "exp-b1-3", "experiment_exposed", 3, mapOf("experimentKey" to experimentKey, "variant" to "B"))
        recordEvent(
            userB1,
            "conv-b1-1",
            "challenge_joined",
            6,
            mapOf(
                "challengeId" to 10,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "B")
            )
        )
        recordEvent(
            userB1,
            "conv-b1-2",
            "challenge_joined",
            7,
            mapOf(
                "challengeId" to 11,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "B")
            )
        )
        recordEvent(userB2, "exp-b2-1", "experiment_exposed", 4, mapOf("experimentKey" to experimentKey, "variant" to "B"))
        recordEvent(
            userB2,
            "conv-b2-1",
            "challenge_joined",
            8,
            mapOf(
                "challengeId" to 10,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "B")
            )
        )

        // 비노출 사용자: 노출 없이 전환만 발생 -> 집계에서 제외되어야 함
        recordEvent(unexposedUser, "conv-unexp-1", "challenge_joined", 9, mapOf("challengeId" to 10))

        mockMvc.get("/api/v1/experiments/$experimentKey/results") {
            header("Authorization", "Bearer $accessToken")
            param("conversionEventName", "challenge_joined")
        }.andExpect {
            status { isOk() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.status") { value("ACTIVE") }
            jsonPath("$.conversionEventName") { value("challenge_joined") }
            jsonPath("$.totalExposedUsers") { value(4) }
            jsonPath("$.totalConvertedUsers") { value(3) }
            jsonPath("$.overallCvr") { value(75.0) }

            // Variant A: exposedUsers=2, exposureEvents=3, convertedUsers=1, conversionEvents=1, cvr=50.0
            jsonPath("$.variants[0].variant") { value("A") }
            jsonPath("$.variants[0].exposedUsers") { value(2) }
            jsonPath("$.variants[0].exposureEvents") { value(3) }
            jsonPath("$.variants[0].convertedUsers") { value(1) }
            jsonPath("$.variants[0].conversionEvents") { value(1) }
            jsonPath("$.variants[0].cvr") { value(50.0) }

            // Variant B: exposedUsers=2, exposureEvents=4, convertedUsers=2, conversionEvents=3, cvr=100.0
            jsonPath("$.variants[1].variant") { value("B") }
            jsonPath("$.variants[1].exposedUsers") { value(2) }
            jsonPath("$.variants[1].exposureEvents") { value(4) }
            jsonPath("$.variants[1].convertedUsers") { value(2) }
            jsonPath("$.variants[1].conversionEvents") { value(3) }
            jsonPath("$.variants[1].cvr") { value(100.0) }
        }
    }
}
