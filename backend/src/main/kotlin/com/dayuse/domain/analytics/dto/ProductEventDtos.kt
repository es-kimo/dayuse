package com.dayuse.domain.analytics.dto

import com.dayuse.domain.analytics.ProductEvent
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import jakarta.validation.constraints.NotBlank
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.format.DateTimeParseException

@JsonIgnoreProperties(ignoreUnknown = true)
data class ProductEventCreateRequest(
    @field:NotBlank(message = "eventId는 필수입니다.")
    val eventId: String,

    @field:NotBlank(message = "eventName은 필수입니다.")
    val eventName: String,

    @field:NotBlank(message = "occurredAt은 필수입니다.")
    val occurredAt: String,

    @field:NotBlank(message = "sessionId는 필수입니다.")
    val sessionId: String,

    val schemaVersion: Int = ProductEvent.DEFAULT_SCHEMA_VERSION,

    @field:NotBlank(message = "appVersion은 필수입니다.")
    val appVersion: String,

    val properties: Map<String, Any?> = emptyMap(),

    /**
     * 클라이언트가 요청 본문에 임의의 userId를 변조/주입해 보낼 수 있는 상황을 시뮬레이션 및 방어하기 위한 필드입니다.
     * 서버는 이 값을 절대 신뢰하거나 저장에 사용하지 않으며, 오직 인증 세션(@CurrentUserId)의 userId만 사용합니다.
     */
    val userId: Long? = null
) {
    /**
     * 프론트엔드 ISO-8601 타임스탬프(예: "2026-09-30T10:00:00.000Z", "2026-09-30T19:00:00+09:00")
     * 또는 LocalDateTime 형식("2026-09-30T19:00:00")을 KST 기준 LocalDateTime으로 변환합니다.
     */
    fun resolveOccurredAtKst(): LocalDateTime {
        val raw = occurredAt.trim()
        if (raw.isEmpty()) {
            throw BadRequestException("occurredAt은 비어 있을 수 없습니다.")
        }

        return try {
            LocalDateTime.parse(raw)
        } catch (_: DateTimeParseException) {
            try {
                OffsetDateTime.parse(raw)
                    .atZoneSameInstant(DateTimeUtils.KST_ZONE)
                    .toLocalDateTime()
            } catch (_: DateTimeParseException) {
                try {
                    Instant.parse(raw)
                        .atZone(DateTimeUtils.KST_ZONE)
                        .toLocalDateTime()
                } catch (_: DateTimeParseException) {
                    throw BadRequestException("유효하지 않은 occurredAt 날짜/시간 형식입니다: $occurredAt")
                }
            }
        }
    }
}

data class ProductEventRecordResponse(
    val id: Long?,
    val eventId: String,
    val status: String,
    val duplicated: Boolean
) {
    companion object {
        const val STATUS_RECORDED = "recorded"
        const val STATUS_DUPLICATE_IGNORED = "duplicate_ignored"
        const val STATUS_ISOLATED_FAILURE = "isolated_failure"

        fun recorded(event: ProductEvent): ProductEventRecordResponse {
            return ProductEventRecordResponse(
                id = event.id,
                eventId = event.eventId,
                status = STATUS_RECORDED,
                duplicated = false
            )
        }

        fun duplicateIgnored(event: ProductEvent? = null, fallbackEventId: String = ""): ProductEventRecordResponse {
            return ProductEventRecordResponse(
                id = event?.id,
                eventId = event?.eventId ?: fallbackEventId,
                status = STATUS_DUPLICATE_IGNORED,
                duplicated = true
            )
        }

        fun isolatedFailure(eventId: String): ProductEventRecordResponse {
            return ProductEventRecordResponse(
                id = null,
                eventId = eventId.trim(),
                status = STATUS_ISOLATED_FAILURE,
                duplicated = false
            )
        }
    }
}
