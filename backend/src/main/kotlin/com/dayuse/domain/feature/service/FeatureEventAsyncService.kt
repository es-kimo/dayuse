package com.dayuse.domain.feature.service

import com.dayuse.domain.feature.FeatureEvent
import com.dayuse.domain.feature.FeatureEventRepository
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Async
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Service
class FeatureEventAsyncService(
    private val featureEventRepository: FeatureEventRepository,
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(javaClass)

    private val sensitiveKeyPatterns = setOf(
        "password", "secret", "token", "account", "bank", "binary", "imagebytes", "card"
    )

    /**
     * 메인 비즈니스 트랜잭션과 철저히 격리된 비동기 이벤트 로깅
     * 장애나 예외가 발생하더라도 메인 흐름에 절대 영향을 주지 않도록 완벽히 격리(Graceful Degradation)합니다.
     */
    @Async("featureLoggingExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun recordEventAsync(
        userId: Long?,
        featureKey: String,
        variant: String,
        eventType: String,
        metadata: Map<String, Any>? = null
    ) {
        try {
            val sanitizedMetadataJson = sanitizeAndSerializeMetadata(metadata)
            val event = FeatureEvent(
                userId = userId,
                featureKey = featureKey,
                variant = variant,
                eventType = eventType,
                metadata = sanitizedMetadataJson
            )
            featureEventRepository.save(event)
            log.debug("FeatureEvent recorded asynchronously: user={}, key={}, type={}", userId, featureKey, eventType)
        } catch (ex: Exception) {
            // 로깅 파이프라인의 에러가 사용자 비즈니스에 영향 주지 않도록 로깅만 남기고 swallow
            log.error("Failed to record feature event asynchronously [key={}, type={}]: {}", featureKey, eventType, ex.message)
        }
    }

    /**
     * 동기 로깅 (테스트 검증 및 즉각 저장이 필요한 케이스 지원)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    fun recordEventSync(
        userId: Long?,
        featureKey: String,
        variant: String,
        eventType: String,
        metadata: Map<String, Any>? = null
    ): FeatureEvent? {
        return try {
            val sanitizedMetadataJson = sanitizeAndSerializeMetadata(metadata)
            val event = FeatureEvent(
                userId = userId,
                featureKey = featureKey,
                variant = variant,
                eventType = eventType,
                metadata = sanitizedMetadataJson
            )
            featureEventRepository.save(event)
        } catch (ex: Exception) {
            log.error("Failed to record feature event synchronously [key={}, type={}]: {}", featureKey, eventType, ex.message)
            null
        }
    }

    /**
     * PII 및 민감 정보(계좌, 비밀번호, 대용량 바이너리 등) 필터링
     */
    private fun sanitizeAndSerializeMetadata(metadata: Map<String, Any>?): String? {
        if (metadata.isNullOrEmpty()) return null
        val filtered = metadata.filterKeys { key ->
            val lowerKey = key.lowercase()
            sensitiveKeyPatterns.none { lowerKey.contains(it) }
        }
        return try {
            objectMapper.writeValueAsString(filtered)
        } catch (e: Exception) {
            log.warn("Failed to serialize event metadata: {}", e.message)
            null
        }
    }
}
