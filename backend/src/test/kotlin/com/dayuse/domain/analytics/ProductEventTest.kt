package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.dao.DataIntegrityViolationException
import java.time.LocalDateTime

@DataJpaTest
class ProductEventTest @Autowired constructor(
    private val productEventRepository: ProductEventRepository
) {

    @ParameterizedTest
    @ValueSource(
        strings = [
            "home_viewed",
            "certification_started",
            "certification_completed",
            "certification_failed",
            "challenge_created",
            "challenge_joined",
            "share_clicked"
        ]
    )
    @DisplayName("초기 표준 이벤트 7종은 모두 유효한 이벤트 이름으로 생성 및 저장된다")
    fun allowsAllSevenStandardEventNames(standardEventName: String) {
        val occurredAt = LocalDateTime.of(2026, 9, 30, 12, 0, 0)
        val receivedAt = LocalDateTime.of(2026, 9, 30, 12, 0, 5)

        val event = ProductEvent.create(
            eventId = "evt-$standardEventName",
            eventName = standardEventName,
            occurredAt = occurredAt,
            authenticatedUserId = 101L,
            sessionId = "sess-001",
            schemaVersion = 1,
            appVersion = "0.9.0",
            properties = mapOf(
                "challengeId" to 10L,
                "groupId" to 3L,
                "experimentKey" to "cert_ux_v2",
                "variant" to "B"
            ),
            receivedAt = receivedAt
        )

        val saved = productEventRepository.saveAndFlush(event)

        assertNotNull(saved.id)
        assertEquals(standardEventName, saved.eventName)
        assertEquals(101L, saved.userId)
        assertEquals(10, (saved.properties["challengeId"] as Number).toInt())
        assertEquals("B", saved.properties["variant"])
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "",
            "   ",
            "HOME_VIEWED",
            "certificationStarted",
            "unknown_event",
            "page_clicked",
            "123_invalid"
        ]
    )
    @DisplayName("정의되지 않았거나 형식이 잘못된 eventName은 BadRequestException을 발생시킨다")
    fun rejectsInvalidOrUnregisteredEventName(invalidEventName: String) {
        assertThrows(BadRequestException::class.java) {
            ProductEvent.create(
                eventId = "evt-invalid-name",
                eventName = invalidEventName,
                occurredAt = LocalDateTime.of(2026, 9, 30, 12, 0, 0),
                authenticatedUserId = 101L,
                sessionId = "sess-001",
                appVersion = "0.9.0"
            )
        }
    }

    @Test
    @DisplayName("occurredAt(행동 발생 시각)과 receivedAt(서버 수신 시각)은 덮어쓰이지 않고 분리되어 저장된다")
    fun preservesOccurredAtAndReceivedAtSeparately() {
        val occurredAt = LocalDateTime.of(2026, 9, 30, 8, 59, 50)
        val receivedAt = LocalDateTime.of(2026, 9, 30, 9, 0, 12)

        val event = ProductEvent.create(
            eventId = "evt-time-separation-001",
            eventName = "certification_completed",
            occurredAt = occurredAt,
            authenticatedUserId = 77L,
            sessionId = "sess-time-01",
            appVersion = "0.9.0",
            properties = mapOf("challengeId" to 55L, "isLate" to false),
            receivedAt = receivedAt
        )

        productEventRepository.saveAndFlush(event)
        val found = productEventRepository.findByEventId("evt-time-separation-001")

        assertNotNull(found)
        assertEquals(occurredAt, found!!.occurredAt)
        assertEquals(receivedAt, found.receivedAt)
        assertTrue(found.receivedAt.isAfter(found.occurredAt))
        assertEquals(77L, found.userId)
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "imageUrl",
            "image_url",
            "photoUrl",
            "s3Key",
            "content",
            "comment",
            "message",
            "nickname",
            "userName",
            "name",
            "accountNumber",
            "account_holder",
            "depositorName",
            "accessToken",
            "token",
            "userId",
            "user_id"
        ]
    )
    @DisplayName("properties에 사진·댓글·이름·계좌번호·토큰·클라이언트 userId 등 금지 키가 포함되면 차단한다")
    fun rejectsForbiddenPropertyKeys(forbiddenKey: String) {
        assertThrows(BadRequestException::class.java) {
            ProductEvent.create(
                eventId = "evt-forbidden-$forbiddenKey",
                eventName = "certification_completed",
                occurredAt = LocalDateTime.of(2026, 9, 30, 12, 0, 0),
                authenticatedUserId = 101L,
                sessionId = "sess-001",
                appVersion = "0.9.0",
                properties = mapOf(
                    "challengeId" to 12L,
                    forbiddenKey to "sensitive-or-forbidden-data"
                )
            )
        }
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "https://cdn.dayuse.com/verifications/photo123.jpg",
            "http://example.com/image.png",
            "s3://dayuse-bucket/uploads/1.jpg",
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
        ]
    )
    @DisplayName("properties의 키를 우회하더라도 값에 이미지/외부 URL이 포함되면 차단한다")
    fun rejectsUrlValuesInProperties(forbiddenValue: String) {
        assertThrows(BadRequestException::class.java) {
            ProductEvent.create(
                eventId = "evt-forbidden-url-val",
                eventName = "share_clicked",
                occurredAt = LocalDateTime.of(2026, 9, 30, 12, 0, 0),
                authenticatedUserId = 101L,
                sessionId = "sess-001",
                appVersion = "0.9.0",
                properties = mapOf(
                    "targetRef" to forbiddenValue
                )
            )
        }
    }

    @Test
    @DisplayName("동일한 eventId를 가진 이벤트는 DB Unique 제약조건에 의해 중복 저장이 차단된다")
    fun enforcesUniqueConstraintOnEventId() {
        val duplicateEventId = "evt-unique-check-001"
        val first = ProductEvent.create(
            eventId = duplicateEventId,
            eventName = "home_viewed",
            occurredAt = LocalDateTime.of(2026, 9, 30, 10, 0, 0),
            authenticatedUserId = 101L,
            sessionId = "sess-001",
            appVersion = "0.9.0"
        )
        productEventRepository.saveAndFlush(first)

        val second = ProductEvent.create(
            eventId = duplicateEventId,
            eventName = "home_viewed",
            occurredAt = LocalDateTime.of(2026, 9, 30, 10, 0, 1),
            authenticatedUserId = 101L,
            sessionId = "sess-001",
            appVersion = "0.9.0"
        )

        assertThrows(DataIntegrityViolationException::class.java) {
            productEventRepository.saveAndFlush(second)
        }
    }
}
