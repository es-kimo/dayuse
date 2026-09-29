@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.feature

import com.dayuse.domain.feature.dto.FeatureEventRequest
import com.dayuse.domain.feature.service.FeatureEventAsyncService
import com.dayuse.domain.feature.service.FeatureFlagService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeatureFlagIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var featureFlagService: FeatureFlagService

    @Autowired
    private lateinit var featureEventAsyncService: FeatureEventAsyncService

    @Autowired
    private lateinit var featureAssignmentRepository: FeatureAssignmentRepository

    @Autowired
    private lateinit var featureEventRepository: FeatureEventRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var testUser: User
    private lateinit var testToken: String

    @BeforeEach
    fun setUp() {
        featureAssignmentRepository.deleteAll()
        featureEventRepository.deleteAll()
        userRepository.deleteAll()
        featureFlagService.resetOverrides()

        testUser = userRepository.save(
            User(
                kakaoId = "987654321",
                nickname = "플래그테스터",
                profileImageUrl = null
            )
        )
        testToken = jwtTokenProvider.generateAccessToken(testUser.id)
    }

    @AfterEach
    fun tearDown() {
        featureFlagService.resetOverrides()
    }

    @Test
    fun `로그인 사용자는 최초 조회 시 피처 플래그가 고정 배정(Sticky)되어 재방문 시에도 항상 동일한 버전을 유지한다`() {
        // Given: 첫 번째 조회 시도
        val result1 = mockMvc.get("/api/v1/features/assignment") {
            header("Authorization", "Bearer $testToken")
            param("featureKey", "ui_refresh_01")
        }.andExpect {
            status { isOk() }
            jsonPath("$.featureKey") { value("ui_refresh_01") }
            jsonPath("$.isOverride") { value(false) }
            jsonPath("$.isKillSwitchActive") { value(false) }
        }.andReturn()

        val json1 = objectMapper.readTree(result1.response.contentAsString)
        val assignedVariant = json1.get("variant").asText()
        assertTrue(assignedVariant == "A" || assignedVariant == "B")

        // Then: DB에 영속화되었는지 확인
        val saved = featureAssignmentRepository.findByUserIdAndFeatureKey(testUser.id, "ui_refresh_01")
        assertNotNull(saved)
        assertEquals(assignedVariant, saved!!.variant)

        // When: 동일 사용자가 다른 세션/기기에서 10번 재조회
        repeat(10) {
            val resultN = mockMvc.get("/api/v1/features/assignment") {
                header("Authorization", "Bearer $testToken")
                param("featureKey", "ui_refresh_01")
            }.andExpect {
                status { isOk() }
            }.andReturn()

            val jsonN = objectMapper.readTree(resultN.response.contentAsString)
            assertEquals(assignedVariant, jsonN.get("variant").asText(), "고정 배정(Sticky)된 버전이 변경되어서는 안 됩니다.")
        }
    }

    @Test
    fun `비상 킬스위치 활성화 시 기존에 B로 배정된 사용자도 즉시 안정 버전 A로 강제 폴백된다`() {
        // Given: 사용자에게 명시적으로 Variant B를 배정
        featureAssignmentRepository.save(
            FeatureAssignment(
                userId = testUser.id,
                featureKey = "ui_refresh_01",
                variant = "B"
            )
        )

        // 정상 상태에서는 B 반환 확인
        val normalResponse = featureFlagService.getOrAssignVariant(testUser.id, "ui_refresh_01")
        assertEquals("B", normalResponse.variant)
        assertFalse(normalResponse.isKillSwitchActive)

        // When: 비상 킬스위치 가동 (enabled=false)
        featureFlagService.setFeatureEnabled("ui_refresh_01", false)

        // Then: 킬스위치 가동 중에는 DB 할당값(B)과 무관하게 즉시 A로 강제 폴백
        val emergencyResponse = featureFlagService.getOrAssignVariant(testUser.id, "ui_refresh_01")
        assertEquals("A", emergencyResponse.variant, "비상 킬스위치 가동 시 무조건 안정 버전 A로 폴백되어야 합니다.")
        assertTrue(emergencyResponse.isKillSwitchActive)

        // API 호출을 통해서도 A 폴백 및 isKillSwitchActive=true 확인
        mockMvc.get("/api/v1/features/assignment") {
            header("Authorization", "Bearer $testToken")
            param("featureKey", "ui_refresh_01")
        }.andExpect {
            status { isOk() }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.isKillSwitchActive") { value(true) }
        }

        // When: 킬스위치 해제 시 원래 배정된 B로 복원
        featureFlagService.setFeatureEnabled("ui_refresh_01", true)
        val restoredResponse = featureFlagService.getOrAssignVariant(testUser.id, "ui_refresh_01")
        assertEquals("B", restoredResponse.variant, "킬스위치 복구 후 원래 배정된 B 버전으로 복원되어야 합니다.")
        assertFalse(restoredResponse.isKillSwitchActive)
    }

    @Test
    fun `QA 및 운영자는 쿼리 파라미터를 통해 킬스위치나 기존 배정을 무시하고 강제 버전을 부여받는다`() {
        // Given: 킬스위치 가동 상태
        featureFlagService.setFeatureEnabled("ui_refresh_01", false)

        // When & Then: ?ui_variant=B 파라미터 전달 시 최우선 순위로 B 강제 적용
        mockMvc.get("/api/v1/features/assignment") {
            header("Authorization", "Bearer $testToken")
            param("featureKey", "ui_refresh_01")
            param("ui_variant", "B")
        }.andExpect {
            status { isOk() }
            jsonPath("$.variant") { value("B") }
            jsonPath("$.isOverride") { value(true) }
        }

        // ?ui_variant=A 파라미터 전달 시 A 강제 적용
        mockMvc.get("/api/v1/features/assignment") {
            header("Authorization", "Bearer $testToken")
            param("featureKey", "ui_refresh_01")
            param("ui_variant", "a")
        }.andExpect {
            status { isOk() }
            jsonPath("$.variant") { value("A") }
            jsonPath("$.isOverride") { value(true) }
        }
    }

    @Test
    fun `동일 사용자의 동시 다발적 최초 배정 요청에도 정확히 1개의 고정 배정 레코드만 생성된다`() {
        val threadCount = 10
        val executor = Executors.newFixedThreadPool(threadCount)
        val readyLatch = CountDownLatch(threadCount)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(threadCount)
        val variants = mutableListOf<String>()
        val successCount = AtomicInteger(0)

        repeat(threadCount) {
            executor.submit {
                readyLatch.countDown()
                startLatch.await()
                try {
                    val resp = featureFlagService.getOrAssignVariant(testUser.id, "ui_refresh_01")
                    synchronized(variants) {
                        variants.add(resp.variant)
                    }
                    successCount.incrementAndGet()
                } finally {
                    doneLatch.countDown()
                }
            }
        }

        readyLatch.await()
        startLatch.countDown()
        doneLatch.await()
        executor.shutdown()

        assertEquals(threadCount, successCount.get(), "모든 스레드가 에러 없이 성공해야 합니다.")
        val distinctVariants = variants.distinct()
        assertEquals(1, distinctVariants.size, "동시 요청에서 모든 스레드가 동일한 버전을 수신해야 합니다.")

        val records = featureAssignmentRepository.findAllByFeatureKey("ui_refresh_01")
        assertEquals(1, records.size, "DB 유니크 제약과 방어로직으로 정확히 1개의 배정 엔티티만 존재해야 합니다.")
    }

    @Test
    fun `프론트엔드 노출 및 액션 이벤트가 메인 로직에 영향 없이 비동기로 안전하게 수집된다`() {
        // When: IMPRESSION 이벤트 전송
        val eventReq = FeatureEventRequest(
            featureKey = "ui_refresh_01",
            variant = "B",
            eventType = "IMPRESSION",
            metadata = mapOf("screen" to "today", "password" to "secret-pw")
        )

        mockMvc.post("/api/v1/features/events") {
            header("Authorization", "Bearer $testToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(eventReq)
        }.andExpect {
            status { isAccepted() }
        }

        // 비동기 처리 완료 대기 (최대 1초)
        var events: List<FeatureEvent> = emptyList()
        for (i in 1..20) {
            Thread.sleep(50)
            events = featureEventRepository.findByFeatureKeyAndEventType("ui_refresh_01", "IMPRESSION")
            if (events.isNotEmpty()) break
        }

        assertTrue(events.isNotEmpty(), "비동기 이벤트가 DB에 저장되어야 합니다.")
        val event = events.first()
        assertEquals("B", event.variant)
        assertEquals(testUser.id, event.userId)

        // 민감 정보(password) 필터링 검증
        assertNotNull(event.metadata)
        assertFalse(event.metadata!!.contains("secret-pw"), "민감 정보(비밀번호 등)는 이벤트 메타데이터에서 제거되어야 합니다.")
        assertTrue(event.metadata!!.contains("today"), "비민감 정보(화면명 등)는 보존되어야 합니다.")
    }

    @Test
    fun `인증 플로우 성공 및 실패 액션 판정 로직이 정상 작동한다`() {
        // 성공 판정
        featureFlagService.evaluateAndLogCertAction(
            userId = testUser.id,
            isSuccess = true,
            metadata = mapOf("challengeId" to 101L)
        )

        // 실패 판정
        featureFlagService.evaluateAndLogCertAction(
            userId = testUser.id,
            isSuccess = false,
            errorMessage = "사진 파일 용량 초과",
            metadata = mapOf("challengeId" to 101L)
        )

        var successEvents: List<FeatureEvent> = emptyList()
        var failEvents: List<FeatureEvent> = emptyList()
        for (i in 1..20) {
            Thread.sleep(50)
            successEvents = featureEventRepository.findByFeatureKeyAndEventType("ui_refresh_01", "CERT_FLOW_SUCCESS")
            failEvents = featureEventRepository.findByFeatureKeyAndEventType("ui_refresh_01", "CERT_FLOW_FAIL")
            if (successEvents.isNotEmpty() && failEvents.isNotEmpty()) break
        }

        assertTrue(successEvents.isNotEmpty(), "CERT_FLOW_SUCCESS 이벤트가 기록되어야 합니다.")
        assertTrue(failEvents.isNotEmpty(), "CERT_FLOW_FAIL 이벤트가 기록되어야 합니다.")
        assertTrue(failEvents.first().metadata!!.contains("사진 파일 용량 초과"))
    }
}
