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
    name = "product_events",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_product_events_event_id",
            columnNames = ["event_id"]
        )
    ],
    indexes = [
        Index(
            name = "idx_product_events_name_occurred",
            columnList = "event_name, occurred_at"
        ),
        Index(
            name = "idx_product_events_user_occurred",
            columnList = "user_id, occurred_at"
        )
    ]
)
class ProductEvent(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(
        name = "event_id",
        nullable = false,
        length = 64
    )
    val eventId: String,

    @Column(
        name = "event_name",
        nullable = false,
        length = 64
    )
    val eventName: String,

    @Column(
        name = "occurred_at",
        nullable = false
    )
    val occurredAt: LocalDateTime,

    @Column(
        name = "received_at",
        nullable = false
    )
    val receivedAt: LocalDateTime,

    @Column(
        name = "user_id",
        nullable = false
    )
    val userId: Long,

    @Column(
        name = "session_id",
        nullable = false,
        length = 64
    )
    val sessionId: String,

    @Column(
        name = "schema_version",
        nullable = false
    )
    val schemaVersion: Int = DEFAULT_SCHEMA_VERSION,

    @Column(
        name = "app_version",
        nullable = false,
        length = 32
    )
    val appVersion: String,

    @Convert(converter = ProductEventPropertiesConverter::class)
    @Column(
        name = "properties",
        nullable = false,
        columnDefinition = "TEXT"
    )
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

            val validatedEventName = ProductEventName.validate(eventName)
            val validatedProperties = ProductEventPropertiesValidator.validateAndSanitize(properties)

            if (validatedEventName == ProductEventName.EXPERIMENT_EXPOSED.value &&
                ExperimentEventContext.extractFrom(validatedProperties) == null
            ) {
                throw BadRequestException("experiment_exposed 이벤트에는 유효한 experimentKey와 variant(A 또는 B)가 필요합니다.")
            }

            return ProductEvent(
                eventId = trimmedEventId,
                eventName = validatedEventName,
                occurredAt = occurredAt,
                receivedAt = receivedAt,
                userId = authenticatedUserId,
                sessionId = trimmedSessionId,
                schemaVersion = schemaVersion,
                appVersion = trimmedAppVersion,
                properties = validatedProperties
            )
        }
    }
}
