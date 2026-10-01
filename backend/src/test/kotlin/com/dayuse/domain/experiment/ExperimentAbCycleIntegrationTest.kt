@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.experiment

import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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

/**
 * 첫 Dayuse A/B Test(`challenge-invite-copy-v1`)의 전체 실험 사이클 E2E 검증. (v0.10 F09)
 *
 * `실험 정의 시드 -> 활성화 -> 결정론적 배정 -> Exposure 기록 -> challenge_joined Conversion 기록
 * -> Variant별 CVR 비교 -> 실험 종료(STOPPED) 후 기본 경험 복귀 및 기존 결과 보존`까지
 * 실제 HTTP API만 사용해 한 줄로 이어 붙인다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExperimentAbCycleIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var experimentSeeder: ExperimentSeeder

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

    private val experimentKey = DayuseExperimentDefinitions.CHALLENGE_INVITE_COPY_V1

    private lateinit var operatorToken: String

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        experimentRepository.deleteAll()
        userRepository.deleteAll()

        val operator = userRepository.save(
            User(kakaoId = "kakao-ab-operator", nickname = "실험운영자", profileImageUrl = null)
        )
        operatorToken = jwtTokenProvider.generateAccessToken(operator.id)
    }

    private fun tokenOf(user: User): String = jwtTokenProvider.generateAccessToken(user.id)

    private fun createParticipants(count: Int): List<User> =
        (1..count).map { index ->
            userRepository.save(
                User(kakaoId = "kakao-ab-user-$index", nickname = "참여자$index", profileImageUrl = null)
            )
        }

    /** 로그인 사용자 본인의 Variant 배정을 조회한다. */
    private fun fetchVariant(user: User): String {
        val body = mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
            header("Authorization", "Bearer ${tokenOf(user)}")
        }.andExpect {
            status { isOk() }
        }.andReturn().response.contentAsString

        val parsed = objectMapper.readTree(body)
        assertEquals(experimentKey, parsed["experimentKey"].asText())
        return parsed["variant"].asText()
    }

    private fun recordEvent(
        actor: User,
        eventId: String,
        eventName: String,
        occurredAtOffsetMinutes: Long,
        properties: Map<String, Any?>
    ) {
        mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer ${tokenOf(actor)}")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                mapOf(
                    "eventId" to eventId,
                    "eventName" to eventName,
                    "occurredAt" to baseTime.plusMinutes(occurredAtOffsetMinutes).toString(),
                    "sessionId" to "sess-ab-${actor.id}",
                    "schemaVersion" to 1,
                    "appVersion" to "0.10.0",
                    "properties" to properties
                )
            )
        }.andExpect { status { isCreated() } }
    }

    private val baseTime = DateTimeUtils.nowKst().minusMinutes(60)

    @Test
    @DisplayName("시드 -> 활성화 -> 배정 -> Exposure -> challenge_joined Conversion -> Variant별 CVR 비교까지 전체 사이클이 이어진다")
    fun fullExperimentCycle() {
        // 1. 실험 정의 시드: 운영자가 켜기 전까지는 DRAFT다.
        experimentSeeder.seed()

        val seeded = experimentRepository.findByExperimentKey(experimentKey)
        assertTrue(seeded != null, "시드가 $experimentKey 실험 정의를 등록해야 한다")
        assertEquals(ExperimentStatus.DRAFT, seeded!!.status)
        assertEquals(100, seeded.rolloutPercentage)

        // 시드는 멱등하다. 두 번 돌려도 등록된 정의가 중복되지 않는다.
        experimentSeeder.seed()
        assertEquals(DayuseExperimentDefinitions.SEEDS.size, experimentRepository.findAllByOrderByCreatedAtDesc().size)
        val reday = experimentRepository.findByExperimentKey(DayuseExperimentDefinitions.CHALLENGE_REDAY_UI_V1)!!
        assertEquals(ExperimentStatus.DRAFT, reday.status)
        assertEquals(100, reday.rolloutPercentage)

        // 2. DRAFT 상태에서는 아무도 실험에 참여하지 않는다 (기본 경험 A).
        val participants = createParticipants(12)
        val draftAssignment = objectMapper.readTree(
            mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
                header("Authorization", "Bearer ${tokenOf(participants.first())}")
            }.andReturn().response.contentAsString
        )
        assertEquals("A", draftAssignment["variant"].asText())
        assertFalse(draftAssignment["participating"].asBoolean())
        assertEquals("INACTIVE_DRAFT", draftAssignment["fallbackReason"].asText())

        // 3. 실험 활성화
        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $operatorToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ACTIVE") }
        }

        // 4. 결정론적 배정: 같은 사용자는 몇 번 물어도 같은 Variant를 받는다.
        val variantByUser = participants.associateWith { fetchVariant(it) }
        participants.forEach { user ->
            assertEquals(
                variantByUser.getValue(user),
                fetchVariant(user),
                "동일 사용자의 배정은 재조회에도 흔들려서는 안 된다"
            )
        }

        val groupA = participants.filter { variantByUser.getValue(it) == "A" }
        val groupB = participants.filter { variantByUser.getValue(it) == "B" }
        assertTrue(groupA.isNotEmpty(), "50:50 배정에서 Variant A 그룹이 비어서는 안 된다")
        assertTrue(groupB.isNotEmpty(), "50:50 배정에서 Variant B 그룹이 비어서는 안 된다")

        // 5. Exposure 기록: 참여 화면 문구가 실제로 노출된 시점.
        //    groupA의 첫 사용자는 화면을 두 번 봤지만(노출 이벤트 2건) 고유 노출자는 1명이어야 한다.
        participants.forEachIndexed { index, user ->
            recordEvent(
                actor = user,
                eventId = "ab-exposure-$index",
                eventName = "experiment_exposed",
                occurredAtOffsetMinutes = 1,
                properties = mapOf(
                    "experimentKey" to experimentKey,
                    "variant" to variantByUser.getValue(user)
                )
            )
        }
        recordEvent(
            actor = groupA.first(),
            eventId = "ab-exposure-a-again",
            eventName = "experiment_exposed",
            occurredAtOffsetMinutes = 2,
            properties = mapOf("experimentKey" to experimentKey, "variant" to "A")
        )

        // 6. Conversion 기록: 각 그룹에서 1명이 챌린지 참여를 완료한다.
        //    B 그룹 전환자는 두 챌린지에 참여해 Raw 전환 이벤트가 2건이지만 고유 전환자는 1명이다.
        val converterA = groupA.first()
        val converterB = groupB.first()

        recordEvent(
            actor = converterA,
            eventId = "ab-conv-a",
            eventName = "challenge_joined",
            occurredAtOffsetMinutes = 10,
            properties = mapOf(
                "challengeId" to 101,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "A")
            )
        )
        recordEvent(
            actor = converterB,
            eventId = "ab-conv-b-1",
            eventName = "challenge_joined",
            occurredAtOffsetMinutes = 11,
            properties = mapOf(
                "challengeId" to 101,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "B")
            )
        )
        recordEvent(
            actor = converterB,
            eventId = "ab-conv-b-2",
            eventName = "challenge_joined",
            occurredAtOffsetMinutes = 12,
            properties = mapOf(
                "challengeId" to 102,
                "experiment" to mapOf("experimentKey" to experimentKey, "variant" to "B")
            )
        )

        // 7. Variant별 결과 비교
        val expectedCvrA = Math.round(1 * 10000.0 / groupA.size) / 100.0
        val expectedCvrB = Math.round(1 * 10000.0 / groupB.size) / 100.0

        mockMvc.get("/api/v1/experiments/$experimentKey/results") {
            header("Authorization", "Bearer $operatorToken")
            param("conversionEventName", "challenge_joined")
        }.andExpect {
            status { isOk() }
            jsonPath("$.experimentKey") { value(experimentKey) }
            jsonPath("$.status") { value("ACTIVE") }
            jsonPath("$.conversionEventName") { value("challenge_joined") }
            jsonPath("$.totalExposedUsers") { value(participants.size) }
            jsonPath("$.totalConvertedUsers") { value(2) }

            jsonPath("$.variants[0].variant") { value("A") }
            jsonPath("$.variants[0].exposedUsers") { value(groupA.size) }
            jsonPath("$.variants[0].exposureEvents") { value(groupA.size + 1) }
            jsonPath("$.variants[0].convertedUsers") { value(1) }
            jsonPath("$.variants[0].conversionEvents") { value(1) }
            jsonPath("$.variants[0].cvr") { value(expectedCvrA) }

            jsonPath("$.variants[1].variant") { value("B") }
            jsonPath("$.variants[1].exposedUsers") { value(groupB.size) }
            jsonPath("$.variants[1].exposureEvents") { value(groupB.size) }
            jsonPath("$.variants[1].convertedUsers") { value(1) }
            jsonPath("$.variants[1].conversionEvents") { value(2) }
            jsonPath("$.variants[1].cvr") { value(expectedCvrB) }
        }
    }

    @Test
    @DisplayName("실험을 종료(STOPPED)하면 신규 노출은 기본 경험(A)으로 돌아가고, 종료 전에 쌓인 결과는 그대로 조회된다")
    fun stoppedExperimentFallsBackButKeepsResults() {
        experimentSeeder.seed()
        mockMvc.post("/api/v1/experiments/$experimentKey/activate") {
            header("Authorization", "Bearer $operatorToken")
        }.andExpect { status { isOk() } }

        val participants = createParticipants(6)
        val variantByUser = participants.associateWith { fetchVariant(it) }

        participants.forEachIndexed { index, user ->
            recordEvent(
                actor = user,
                eventId = "stop-exposure-$index",
                eventName = "experiment_exposed",
                occurredAtOffsetMinutes = 1,
                properties = mapOf(
                    "experimentKey" to experimentKey,
                    "variant" to variantByUser.getValue(user)
                )
            )
        }
        recordEvent(
            actor = participants.first(),
            eventId = "stop-conv-1",
            eventName = "challenge_joined",
            occurredAtOffsetMinutes = 5,
            properties = mapOf(
                "challengeId" to 201,
                "experiment" to mapOf(
                    "experimentKey" to experimentKey,
                    "variant" to variantByUser.getValue(participants.first())
                )
            )
        )

        // 실험 종료
        mockMvc.post("/api/v1/experiments/$experimentKey/stop") {
            header("Authorization", "Bearer $operatorToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("STOPPED") }
        }

        // 종료 후 신규 배정은 전원 기본 경험(A) + 미참여
        participants.forEach { user ->
            mockMvc.get("/api/v1/experiments/$experimentKey/assignment") {
                header("Authorization", "Bearer ${tokenOf(user)}")
            }.andExpect {
                status { isOk() }
                jsonPath("$.variant") { value("A") }
                jsonPath("$.participating") { value(false) }
                jsonPath("$.isFallback") { value(true) }
                jsonPath("$.fallbackReason") { value("INACTIVE_STOPPED") }
            }
        }

        // 종료 이후에도 참여 행동 이벤트 수집은 계속 정상 동작한다 (핵심 기능 보호).
        // 실험에 노출된 적 없는 신규 사용자이므로 실험 성과(CVR)에는 섞이지 않는다.
        val newcomer = userRepository.save(
            User(kakaoId = "kakao-ab-newcomer", nickname = "종료후참여자", profileImageUrl = null)
        )
        recordEvent(
            actor = newcomer,
            eventId = "stop-conv-after",
            eventName = "challenge_joined",
            occurredAtOffsetMinutes = 30,
            properties = mapOf("challengeId" to 202)
        )

        // 종료 전에 쌓인 분석 결과는 삭제/변형 없이 그대로 조회된다
        mockMvc.get("/api/v1/experiments/$experimentKey/results") {
            header("Authorization", "Bearer $operatorToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("STOPPED") }
            jsonPath("$.conversionEventName") { value("challenge_joined") }
            jsonPath("$.totalExposedUsers") { value(participants.size) }
            jsonPath("$.totalConvertedUsers") { value(1) }
        }
    }
}
