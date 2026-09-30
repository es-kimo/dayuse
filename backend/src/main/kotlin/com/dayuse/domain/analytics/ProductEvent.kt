package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Convert
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

@Entity
@Table(
    name = "product_events"
    // TODO [사용자 미션 1-1]: event_id 컬럼에 대한 Unique 제약조건(uk_product_events_event_id)과
    // (event_name, occurred_at), (user_id, occurred_at) 복합 인덱스를 선언하세요.
)
class ProductEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "event_id", nullable = false, length = 64)
    val eventId: String,

    @Column(name = "event_name", nullable = false, length = 64)
    val eventName: String,

    @Column(name = "occurred_at", nullable = false)
    val occurredAt: LocalDateTime,

    @Column(name = "received_at", nullable = false)
    val receivedAt: LocalDateTime,

    @Column(name = "user_id", nullable = false)
    val userId: Long,

    @Column(name = "session_id", nullable = false, length = 64)
    val sessionId: String,

    @Column(name = "schema_version", nullable = false)
    val schemaVersion: Int = DEFAULT_SCHEMA_VERSION,

    @Column(name = "app_version", nullable = false, length = 32)
    val appVersion: String,

    @Convert(converter = ProductEventPropertiesConverter::class)
    @Column(name = "properties", nullable = false, columnDefinition = "TEXT")
    val properties: Map<String, Any?> = emptyMap()
) {
    companion object {
        const val DEFAULT_SCHEMA_VERSION = 1

        fun create(
            eventId: String,
            eventName: String,
            occurredAt: LocalDateTime,
            authenticatedUserId: Long,
            sessionId: String,
            schemaVersion: Int = DEFAULT_SCHEMA_VERSION,
            appVersion: String,
            properties: Map<String, Any?> = emptyMap(),
            receivedAt: LocalDateTime = DateTimeUtils.nowKst()
        ): ProductEvent {
            val trimmedEventId = eventId.trim()
            if (trimmedEventId.isEmpty() || trimmedEventId.length > 64) {
                throw BadRequestException("유효하지 않은 eventId입니다.")
            }
            if (authenticatedUserId <= 0L) {
                throw BadRequestException("유효한 서버 인증 userId가 필요합니다.")
            }
            val trimmedSessionId = sessionId.trim()
            if (trimmedSessionId.isEmpty() || trimmedSessionId.length > 64) {
                throw BadRequestException("유효하지 않은 sessionId입니다.")
            }
            if (schemaVersion <= 0) {
                throw BadRequestException("schemaVersion은 1 이상이어야 합니다.")
            }
            val trimmedAppVersion = appVersion.trim()
            if (trimmedAppVersion.isEmpty() || trimmedAppVersion.length > 32) {
                throw BadRequestException("유효하지 않은 appVersion입니다.")
            }

            // TODO [사용자 미션 1-2]:
            // 1) ProductEventName.validate(eventName) 및 ProductEventPropertiesValidator.validateAndSanitize(properties)를 호출해 검증된 값을 확보하세요.
            // 2) occurredAt(실제 행동 발생 시각)과 receivedAt(서버 수신 시각)이 서로 덮어쓰이지 않고 분리 저장되도록 매핑하세요.
            // 3) userId에 서버 인증 컨텍스트에서 확정된 authenticatedUserId를 바인딩하세요.
            return ProductEvent(
                eventId = trimmedEventId,
                eventName = eventName,
                occurredAt = receivedAt,
                receivedAt = receivedAt,
                userId = 0L,
                sessionId = trimmedSessionId,
                schemaVersion = schemaVersion,
                appVersion = trimmedAppVersion,
                properties = properties
            )
        }
    }
}
