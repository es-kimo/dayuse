package com.dayuse.domain.analytics.service

import com.dayuse.domain.analytics.ProductEvent
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.dto.ProductEventRecordResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.TransactionDefinition
import org.springframework.transaction.support.TransactionTemplate

@Service
class ProductEventService(
    private val productEventRepository: ProductEventRepository,
    transactionManager: PlatformTransactionManager
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 비즈니스 도메인 트랜잭션과 분리된 독립 트랜잭션(REQUIRES_NEW) 템플릿.
     * 동시 요청(Race Condition) 시 발생하는 DataIntegrityViolationException이
     * 외부 트랜잭션을 rollback-only로 오염시키지 않도록 독립 트랜잭션 경계를 형성합니다.
     */
    private val requiresNewTransactionTemplate = TransactionTemplate(transactionManager).apply {
        propagationBehavior = TransactionDefinition.PROPAGATION_REQUIRES_NEW
    }

    /**
     * Product Event 수집 및 멱등 저장 처리.
     * 1. 클라이언트가 요청 바디에 보낸 request.userId는 무시하고, 서버 인증 세션의 authenticatedUserId만 신뢰합니다.
     * 2. occurredAt(클라이언트 행동 발생 시각)을 보존하고 receivedAt(서버 수신 시각)을 기록합니다.
     * 3. 동일 eventId가 순차 또는 동시에 재전송되더라도 중복 저장 없이 멱등한 응답을 반환합니다.
     */
    fun recordEvent(
        authenticatedUserId: Long,
        request: ProductEventCreateRequest
    ): ProductEventRecordResponse {
        val trimmedEventId = request.eventId.trim()
        if (trimmedEventId.isEmpty() || trimmedEventId.length > 64) {
            throw BadRequestException("유효하지 않은 eventId입니다.")
        }

        // 1. 순차 재전송(중복 요청) 사전 확인: 이미 저장된 eventId면 추가 저장 없이 즉시 멱등 응답 반환
        val existingEvent = productEventRepository.findByEventId(trimmedEventId)
        if (existingEvent != null) {
            return ProductEventRecordResponse.duplicateIgnored(existingEvent)
        }

        // 2. 도메인 엔티티 생성 및 스키마/민감정보 검증
        //    - request.userId(클라이언트 전달값)는 무시하고 authenticatedUserId(서버 인증 정보)를 바인딩
        //    - occurredAt(클라이언트 발생 시각) 보존 및 receivedAt(서버 수신 시각) 기록
        val occurredAt = request.resolveOccurredAtKst()
        val receivedAt = DateTimeUtils.nowKst()

        val newEvent = ProductEvent.create(
            eventId = trimmedEventId,
            eventName = request.eventName,
            occurredAt = occurredAt,
            authenticatedUserId = authenticatedUserId,
            sessionId = request.sessionId,
            schemaVersion = request.schemaVersion,
            appVersion = request.appVersion,
            properties = request.properties,
            receivedAt = receivedAt
        )

        // 3. 독립 트랜잭션으로 저장 수행 및 동시 재전송(Race Condition) 시 Unique 제약 충돌 멱등 흡수
        return try {
            val saved = requiresNewTransactionTemplate.execute {
                productEventRepository.saveAndFlush(newEvent)
            }!!
            ProductEventRecordResponse.recorded(saved)
        } catch (ex: DataIntegrityViolationException) {
            log.debug("Duplicate product event detected concurrently [eventId={}]: {}", trimmedEventId, ex.message)
            val concurrentSaved = productEventRepository.findByEventId(trimmedEventId)
            ProductEventRecordResponse.duplicateIgnored(
                event = concurrentSaved,
                fallbackEventId = trimmedEventId
            )
        }
    }

    /**
     * 핵심 비즈니스 로직(인증·챌린지·정산 등) 흐름 중 안전하게 이벤트를 기록할 때 사용하는 격리 메서드.
     * 분석 이벤트 검증/저장 중 어떤 예외가 발생하더라도 호출자의 핵심 비즈니스 트랜잭션을
     * 롤백시키거나 실패시키지 않고 로그만 남긴 뒤 안전하게 격리 응답을 반환합니다.
     */
    fun recordEventSafely(
        authenticatedUserId: Long,
        request: ProductEventCreateRequest
    ): ProductEventRecordResponse {
        return try {
            recordEvent(
                authenticatedUserId = authenticatedUserId,
                request = request
            )
        } catch (ex: Exception) {
            log.warn(
                "Isolated product event recording failure [eventId={}, eventName={}]: {}",
                request.eventId,
                request.eventName,
                ex.message
            )
            ProductEventRecordResponse.isolatedFailure(request.eventId)
        }
    }
}
