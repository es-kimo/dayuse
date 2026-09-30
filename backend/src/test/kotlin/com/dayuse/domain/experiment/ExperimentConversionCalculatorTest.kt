@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.experiment

import com.dayuse.domain.analytics.ProductEvent
import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.time.LocalDateTime

class ExperimentConversionCalculatorTest {

    private val expKey = "challenge-invite-copy-v1"
    private val t0 = LocalDateTime.of(2026, 10, 1, 10, 0, 0)

    private fun event(
        id: String,
        userId: Long,
        eventName: String,
        occurredAt: LocalDateTime,
        properties: Map<String, Any?>
    ): ProductEvent {
        return ProductEvent.create(
            eventId = id,
            eventName = eventName,
            occurredAt = occurredAt,
            authenticatedUserId = userId,
            sessionId = "sess-$userId",
            appVersion = "0.10.0",
            properties = properties,
            receivedAt = occurredAt
        )
    }

    @Test
    @DisplayName("한 사용자가 10번 노출되고 3번 전환해도 고유 사용자 수(1명/1명) 기준으로 CVR 100.0%를 산출한다")
    fun calculatesCvrByUniqueUsersDespiteRepeatedExposuresAndConversions() {
        val exposures = (1..10).map { i ->
            event(
                id = "exp-u1-$i",
                userId = 1L,
                eventName = "experiment_exposed",
                occurredAt = t0.plusMinutes(i.toLong()),
                properties = mapOf("experimentKey" to expKey, "variant" to "B")
            )
        }

        val conversions = (1..3).map { i ->
            event(
                id = "conv-u1-$i",
                userId = 1L,
                eventName = "challenge_joined",
                occurredAt = t0.plusMinutes(20L + i),
                properties = mapOf(
                    "challengeId" to i,
                    "experiment" to mapOf("experimentKey" to expKey, "variant" to "B")
                )
            )
        }

        val summary = ExperimentConversionCalculator.calculate(
            experimentKey = expKey,
            conversionEventName = "challenge_joined",
            events = exposures + conversions
        )

        val variantA = summary.variants.first { it.variant == ExperimentVariant.A }
        val variantB = summary.variants.first { it.variant == ExperimentVariant.B }

        assertEquals(0L, variantA.exposedUsers)
        assertEquals(0L, variantA.convertedUsers)
        assertEquals(0.0, variantA.cvr)

        assertEquals(1L, variantB.exposedUsers)
        assertEquals(10L, variantB.exposureEvents)
        assertEquals(1L, variantB.convertedUsers)
        assertEquals(3L, variantB.conversionEvents)
        assertEquals(100.0, variantB.cvr)
    }

    @Test
    @DisplayName("비노출 사용자의 전환 이벤트와 최초 노출 이전에 발생한 전환 이벤트는 CVR 집계에서 제외한다")
    fun excludesUnexposedUsersAndPreExposureConversions() {
        val events = listOf(
            // User 1 (Variant A): 노출 후 전환 성공 -> 집계 포함
            event(
                id = "e-1",
                userId = 1L,
                eventName = "experiment_exposed",
                occurredAt = t0,
                properties = mapOf("experimentKey" to expKey, "variant" to "A")
            ),
            event(
                id = "c-1",
                userId = 1L,
                eventName = "challenge_joined",
                occurredAt = t0.plusMinutes(5),
                properties = mapOf("challengeId" to 10)
            ),
            // User 2 (Variant A): 노출만 되고 전환 없음 -> 분모에만 포함
            event(
                id = "e-2",
                userId = 2L,
                eventName = "experiment_exposed",
                occurredAt = t0,
                properties = mapOf("experimentKey" to expKey, "variant" to "A")
            ),
            // User 3 (Variant A): 전환 이벤트가 노출보다 먼저 발생 -> 전환에서 제외
            event(
                id = "c-3-before",
                userId = 3L,
                eventName = "challenge_joined",
                occurredAt = t0.minusMinutes(10),
                properties = mapOf("challengeId" to 10)
            ),
            event(
                id = "e-3",
                userId = 3L,
                eventName = "experiment_exposed",
                occurredAt = t0,
                properties = mapOf("experimentKey" to expKey, "variant" to "A")
            ),
            // User 4 (비노출 사용자): experiment_exposed 없이 전환만 발생 -> 분모·분자 모두 제외
            event(
                id = "c-4-unexposed",
                userId = 4L,
                eventName = "challenge_joined",
                occurredAt = t0.plusMinutes(10),
                properties = mapOf(
                    "challengeId" to 10,
                    "experiment" to mapOf("experimentKey" to expKey, "variant" to "A")
                )
            )
        )

        val summary = ExperimentConversionCalculator.calculate(
            experimentKey = expKey,
            conversionEventName = "challenge_joined",
            events = events
        )

        val variantA = summary.variants.first { it.variant == ExperimentVariant.A }
        // 노출 고유 사용자: User 1, User 2, User 3 -> 3명
        assertEquals(3L, variantA.exposedUsers)
        // 노출 이후 전환 고유 사용자: User 1 -> 1명 (CVR = 1/3 = 33.33%)
        assertEquals(1L, variantA.convertedUsers)
        assertEquals(1L, variantA.conversionEvents)
        assertEquals(33.33, variantA.cvr)
    }

    @Test
    @DisplayName("experiment_exposed 자체를 conversionEventName으로 지정하거나 필수 속성 없이 기록하면 예외가 발생한다")
    fun rejectsInvalidConversionEventOrMissingExposureContext() {
        assertThrows(BadRequestException::class.java) {
            ExperimentConversionCalculator.validateConversionEventName("experiment_exposed")
        }

        assertThrows(BadRequestException::class.java) {
            ProductEvent.create(
                eventId = "invalid-exposed-1",
                eventName = "experiment_exposed",
                occurredAt = t0,
                authenticatedUserId = 1L,
                sessionId = "sess-1",
                appVersion = "0.10.0",
                properties = emptyMap()
            )
        }
    }
}
