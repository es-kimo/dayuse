@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.dto.ProductEventRecordResponse
import com.dayuse.domain.analytics.service.ProductEventService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDateTime
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductEventIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var productEventService: ProductEventService

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var transactionManager: PlatformTransactionManager

    private lateinit var authenticatedUser: User
    private lateinit var otherUser: User
    private lateinit var accessToken: String

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        userRepository.deleteAll()

        authenticatedUser = userRepository.save(
            User(
                kakaoId = "kakao-event-auth-user",
                nickname = "이벤트인증유저",
                profileImageUrl = null
            )
        )
        otherUser = userRepository.save(
            User(
                kakaoId = "kakao-event-other-user",
                nickname = "타인유저",
                profileImageUrl = null
            )
        )
        accessToken = jwtTokenProvider.generateAccessToken(authenticatedUser.id)
    }

    @Test
    @DisplayName("클라이언트가 요청 본문에 타인의 userId를 변조해 보내도 무시하고 서버 인증 세션의 userId로만 저장한다")
    fun ignoresClientSuppliedUserIdAndUsesAuthenticatedSessionUserId() {
        val forgedPayload = mapOf(
            "eventId" to "evt-auth-check-001",
            "eventName" to "certification_started",
            "occurredAt" to "2026-09-30T08:30:00",
            "sessionId" to "sess-auth-001",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0",
            "userId" to otherUser.id, // 클라이언트가 악의적으로 주입한 타인 userId
            "properties" to mapOf(
                "challengeId" to 101,
                "groupId" to 12
            )
        )

        mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(forgedPayload)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.eventId") { value("evt-auth-check-001") }
            jsonPath("$.status") { value(ProductEventRecordResponse.STATUS_RECORDED) }
            jsonPath("$.duplicated") { value(false) }
        }

        val saved = productEventRepository.findByEventId("evt-auth-check-001")
        assertNotNull(saved)
        assertEquals(
            authenticatedUser.id,
            saved!!.userId,
            "클라이언트 페이로드의 userId가 아닌 서버 인증 주체의 userId로 저장되어야 합니다."
        )
    }

    @Test
    @DisplayName("비인증 사용자의 이벤트 수집 요청은 401 Unauthorized로 차단된다")
    fun rejectsUnauthenticatedEventRequest() {
        val payload = mapOf(
            "eventId" to "evt-unauth-001",
            "eventName" to "home_viewed",
            "occurredAt" to "2026-09-30T10:00:00",
            "sessionId" to "sess-unauth-001",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0"
        )

        mockMvc.post("/api/v1/events") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isUnauthorized() }
        }

        assertEquals(0L, productEventRepository.count())
    }

    @Test
    @DisplayName("클라이언트 발생 시각(occurredAt, ISO-8601 Z 포함)을 보존하고 서버 수신 시각(receivedAt)을 별도로 기록한다")
    fun preservesOccurredAtAndRecordsServerReceivedAt() {
        // UTC 2026-09-30T00:15:30Z == KST 2026-09-30T09:15:30
        val payload = mapOf(
            "eventId" to "evt-timestamp-001",
            "eventName" to "home_viewed",
            "occurredAt" to "2026-09-30T00:15:30Z",
            "sessionId" to "sess-time-001",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0",
            "properties" to mapOf("groupId" to 7)
        )

        mockMvc.post("/api/events") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.duplicated") { value(false) }
        }

        val saved = productEventRepository.findByEventId("evt-timestamp-001")
        assertNotNull(saved)
        assertEquals(LocalDateTime.of(2026, 9, 30, 9, 15, 30), saved!!.occurredAt)
        assertNotNull(saved.receivedAt)
        assertTrue(
            saved.receivedAt.isAfter(saved.occurredAt),
            "서버 수신 시각(receivedAt)은 과거 행동 발생 시각(occurredAt)과 분리되어 기록되어야 합니다."
        )
    }

    @Test
    @DisplayName("동일한 eventId가 순차적으로 재전송되면 중복 저장하지 않고 멱등한 성공 응답을 반환한다")
    fun handlesSequentialDuplicateEventIdIdempotently() {
        val duplicateEventId = "evt-seq-dup-001"
        val payload = mapOf(
            "eventId" to duplicateEventId,
            "eventName" to "challenge_joined",
            "occurredAt" to "2026-09-30T11:00:00",
            "sessionId" to "sess-dup-001",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0",
            "properties" to mapOf("challengeId" to 55)
        )

        // 1차 전송: 신규 저장 (201 Created, duplicated = false)
        mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.eventId") { value(duplicateEventId) }
            jsonPath("$.status") { value(ProductEventRecordResponse.STATUS_RECORDED) }
            jsonPath("$.duplicated") { value(false) }
        }

        // 2차 재전송 (네트워크 재시도 시뮬레이션): 추가 저장 없이 멱등 응답 (200 OK, duplicated = true)
        mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(payload)
        }.andExpect {
            status { isOk() }
            jsonPath("$.eventId") { value(duplicateEventId) }
            jsonPath("$.status") { value(ProductEventRecordResponse.STATUS_DUPLICATE_IGNORED) }
            jsonPath("$.duplicated") { value(true) }
        }

        assertEquals(1L, productEventRepository.count(), "동일한 eventId 재전송 시 레코드는 단 1건만 존재해야 합니다.")
    }

    @Test
    @DisplayName("동일한 eventId가 동시에(Race Condition) 다중 요청되더라도 500/409 에러 없이 단 1건만 저장된다")
    fun handlesConcurrentDuplicateEventIdWithoutError() {
        val concurrentEventId = "evt-concurrent-dup-001"
        val threadCount = 10
        val executor = Executors.newFixedThreadPool(threadCount)
        val readyLatch = CountDownLatch(threadCount)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(threadCount)
        val successCount = AtomicInteger(0)
        val errorCount = AtomicInteger(0)

        val request = ProductEventCreateRequest(
            eventId = concurrentEventId,
            eventName = "certification_completed",
            occurredAt = "2026-09-30T12:00:00",
            sessionId = "sess-concurrent-001",
            schemaVersion = 1,
            appVersion = "0.9.0",
            properties = mapOf("challengeId" to 77L)
        )

        repeat(threadCount) {
            executor.submit {
                readyLatch.countDown()
                startLatch.await()
                try {
                    val response = productEventService.recordEvent(
                        authenticatedUserId = authenticatedUser.id,
                        request = request
                    )
                    if (response.eventId == concurrentEventId) {
                        successCount.incrementAndGet()
                    }
                } catch (_: Exception) {
                    errorCount.incrementAndGet()
                } finally {
                    doneLatch.countDown()
                }
            }
        }

        readyLatch.await()
        startLatch.countDown()
        doneLatch.await()
        executor.shutdown()

        assertEquals(0, errorCount.get(), "동시 중복 요청에서 예외가 외부로 전파되어서는 안 됩니다.")
        assertEquals(threadCount, successCount.get(), "모든 동시 요청이 정상(멱등) 응답을 반환해야 합니다.")
        assertEquals(1L, productEventRepository.count(), "DB에는 정확히 1개의 이벤트 레코드만 저장되어야 합니다.")
    }

    @Test
    @DisplayName("properties에 금지된 민감정보 키(계좌번호, 사진 URL, 댓글 등)가 포함되면 400 Bad Request로 차단한다")
    fun rejectsSensitivePropertiesViaApi() {
        val invalidPayload = mapOf(
            "eventId" to "evt-sensitive-001",
            "eventName" to "certification_completed",
            "occurredAt" to "2026-09-30T12:30:00",
            "sessionId" to "sess-sens-001",
            "schemaVersion" to 1,
            "appVersion" to "0.9.0",
            "properties" to mapOf(
                "challengeId" to 10,
                "accountNumber" to "110-123-456789"
            )
        )

        mockMvc.post("/api/v1/events") {
            header("Authorization", "Bearer $accessToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(invalidPayload)
        }.andExpect {
            status { isBadRequest() }
        }

        assertFalse(productEventRepository.existsByEventId("evt-sensitive-001"))
    }

    @Test
    @DisplayName("핵심 비즈니스 트랜잭션 내부에서 이벤트 저장(recordEventSafely)이 실패하더라도 비즈니스 트랜잭션은 롤백되지 않고 정상 커밋된다")
    fun isolatesEventFailureFromBusinessTransaction() {
        val txTemplate = TransactionTemplate(transactionManager)

        val businessUser = txTemplate.execute {
            val savedBusinessUser = userRepository.save(
                User(
                    kakaoId = "kakao-business-tx-user",
                    nickname = "비즈니스트랜잭션유저",
                    profileImageUrl = null
                )
            )

            // 비즈니스 트랜잭션 도중 비정상 이벤트(허용되지 않는 민감정보 및 잘못된 이벤트명)가 발생하여 실패하는 상황 시뮬레이션
            val brokenEventRequest = ProductEventCreateRequest(
                eventId = "evt-broken-in-tx-001",
                eventName = "invalid_unknown_event_name",
                occurredAt = "2026-09-30T13:00:00",
                sessionId = "sess-tx-001",
                schemaVersion = 1,
                appVersion = "0.9.0",
                properties = mapOf("password" to "leaked-secret")
            )

            val eventResult = productEventService.recordEventSafely(
                authenticatedUserId = savedBusinessUser.id,
                request = brokenEventRequest
            )
            assertEquals(ProductEventRecordResponse.STATUS_ISOLATED_FAILURE, eventResult.status)

            savedBusinessUser
        }

        assertNotNull(businessUser)
        assertTrue(
            userRepository.findById(businessUser!!.id).isPresent,
            "이벤트 저장 중 예외가 발생하더라도 핵심 비즈니스 트랜잭션은 롤백되지 않고 커밋되어야 합니다."
        )
        assertFalse(productEventRepository.existsByEventId("evt-broken-in-tx-001"))
    }
}
