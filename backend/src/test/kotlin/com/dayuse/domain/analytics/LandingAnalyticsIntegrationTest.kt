@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.domain.analytics.dto.LandingEventCreateRequest
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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LandingAnalyticsIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var repository: LandingAnalyticsEventRepository

    @BeforeEach
    fun setUp() {
        repository.deleteAll()
    }

    @Test
    @DisplayName("비로그인 상태에서 랜딩 이벤트(POST /api/v1/public/analytics/events)를 정상 수집할 수 있다")
    fun recordLandingEventWithoutAuth() {
        val request = LandingEventCreateRequest(
            sessionId = "sess_test_12345",
            eventName = "landing_view",
            placement = null,
            utmSource = "instagram",
            utmMedium = "cpc",
            utmCampaign = "spring_2026",
            utmContent = "card_1",
            referrer = "https://instagram.com"
        )

        mockMvc.post("/api/v1/public/analytics/events") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.status") { value("recorded") }
            jsonPath("$.id") { isNumber() }
        }

        val events = repository.findAll()
        assertEquals(1, events.size)
        val saved = events[0]
        assertEquals("sess_test_12345", saved.sessionId)
        assertEquals("landing_view", saved.eventName)
        assertEquals("instagram", saved.utmSource)
        assertEquals("cpc", saved.utmMedium)
        assertEquals("spring_2026", saved.utmCampaign)
        assertEquals("card_1", saved.utmContent)
        assertEquals("https://instagram.com", saved.referrer)
        assertNotNull(saved.createdAt)
    }

    @Test
    @DisplayName("UTM 정보가 없는 경우 direct/unknown 기본값으로 안전하게 기록된다")
    fun recordEventWithDefaultUtm() {
        val request = LandingEventCreateRequest(
            sessionId = "sess_direct_001",
            eventName = "hero_cta_click",
            placement = "hero"
        )

        mockMvc.post("/api/v1/public/analytics/events") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }

        val events = repository.findAll()
        assertEquals(1, events.size)
        val saved = events[0]
        assertEquals("hero_cta_click", saved.eventName)
        assertEquals("hero", saved.placement)
        assertEquals("direct", saved.utmSource)
        assertEquals("unknown", saved.utmMedium)
        assertEquals("unknown", saved.utmCampaign)
        assertEquals("unknown", saved.utmContent)
    }

    @Test
    @DisplayName("동일 세션의 반복 클릭은 전환 세션 수를 부풀리지 않고 1건으로 계산된다 (PRD 전환율 산식 검증)")
    fun verifyConversionRateDeduplication() {
        // 세션 1: 인스타그램 유입 -> landing_view -> hero_cta_click -> footer_cta_click (2번 클릭)
        postEvent("sess_1", "landing_view", null, "instagram")
        postEvent("sess_1", "hero_cta_click", "hero", "instagram")
        postEvent("sess_1", "footer_cta_click", "bottom", "instagram")

        // 세션 2: 카카오톡 유입 -> landing_view -> my_group_click (시작 CTA 클릭 안함)
        postEvent("sess_2", "landing_view", null, "kakaotalk")
        postEvent("sess_2", "my_group_click", null, "kakaotalk")

        // 세션 3: 직접 유입 -> landing_view -> 아무것도 클릭 안함
        postEvent("sess_3", "landing_view", null, "direct")

        // 세션 4: 인스타그램 유입 -> landing_view -> hero_cta_click (1번 클릭)
        postEvent("sess_4", "landing_view", null, "instagram")
        postEvent("sess_4", "hero_cta_click", "hero", "instagram")

        // 총 4개 방문 세션 중 시작 클릭한 세션은 sess_1, sess_4 총 2개 세션 (클릭률 = 2 / 4 = 0.5)
        mockMvc.get("/api/v1/public/analytics/summary")
            .andExpect {
                status { isOk() }
                jsonPath("$.totalLandingSessions") { value(4) }
                jsonPath("$.totalStartClickSessions") { value(2) }
                jsonPath("$.heroCtaClickSessions") { value(2) }
                jsonPath("$.footerCtaClickSessions") { value(1) }
                jsonPath("$.myGroupClickSessions") { value(1) }
                jsonPath("$.startClickRate") { value(0.5) }
                jsonPath("$.sources.length()") { value(3) }
            }
    }

    private fun postEvent(sessionId: String, eventName: String, placement: String?, utmSource: String) {
        val request = LandingEventCreateRequest(
            sessionId = sessionId,
            eventName = eventName,
            placement = placement,
            utmSource = utmSource,
            utmMedium = "test",
            utmCampaign = "campaign",
            utmContent = "content"
        )
        mockMvc.post("/api/v1/public/analytics/events") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }
    }
}
