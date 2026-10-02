@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.feature

import com.dayuse.domain.feature.dto.FeatureEventRequest
import com.dayuse.domain.feature.service.FeatureEventAsyncService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeatureEventIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var featureEventAsyncService: FeatureEventAsyncService

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
        featureEventRepository.deleteAll()
        userRepository.deleteAll()

        testUser = userRepository.save(
            User(
                kakaoId = "987654321",
                nickname = "플래그테스터",
                profileImageUrl = null
            )
        )
        testToken = jwtTokenProvider.generateAccessToken(testUser.id)
    }

    @Test
    fun `프론트엔드 노출 및 액션 이벤트가 메인 로직에 영향 없이 비동기로 안전하게 수집된다`() {
        // When: IMPRESSION 이벤트 전송
        val eventReq = FeatureEventRequest(
            featureKey = "pwa_install",
            variant = "prod",
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
            events = featureEventRepository.findByFeatureKeyAndEventType("pwa_install", "IMPRESSION")
            if (events.isNotEmpty()) break
        }

        assertTrue(events.isNotEmpty(), "비동기 이벤트가 DB에 저장되어야 합니다.")
        val event = events.first()
        assertEquals("prod", event.variant)
        assertEquals(testUser.id, event.userId)

        // 민감 정보(password) 필터링 검증
        assertNotNull(event.metadata)
        assertFalse(event.metadata!!.contains("secret-pw"), "민감 정보(비밀번호 등)는 이벤트 메타데이터에서 제거되어야 합니다.")
        assertTrue(event.metadata!!.contains("today"), "비민감 정보(화면명 등)는 보존되어야 합니다.")
    }
}
