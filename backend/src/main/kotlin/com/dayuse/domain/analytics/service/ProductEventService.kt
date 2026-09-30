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

        // TODO [사용자 미션 1]: 순차 중복 확인 및 서버 인증 userId / receivedAt 바인딩을 통한 ProductEvent 도메인 생성
        // 1) productEventRepository.findByEventId(trimmedEventId)로 이미 저장된 이벤트인지 확인하고,
        //    존재한다면 추가 저장 없이 ProductEventRecordResponse.duplicateIgnored(existingEvent)를 즉시 반환하세요.
        // 2) 신규 이벤트라면 request.resolveOccurredAtKst()로 클라이언트 발생 시각(occurredAt)을 파싱하고,
        //    DateTimeUtils.nowKst()로 서버 수신 시각(receivedAt)을 구하세요.
        // 3) ProductEvent.create(...)를 호출해 도메인 엔티티(newEvent)를 생성하세요.
        //    (주의: 클라이언트가 보낸 request.userId는 절대 사용하지 말고, 서버 인증 세션의 authenticatedUserId를 전달해야 합니다!)

        // TODO [사용자 미션 2]: 독립 트랜잭션 저장 및 동시 재전송(Race Condition) 시 DataIntegrityViolationException 멱등 흡수
        // 1) requiresNewTransactionTemplate.execute { productEventRepository.saveAndFlush(newEvent) }!! 로 저장한 뒤
        //    ProductEventRecordResponse.recorded(saved)를 반환하세요.
        // 2) 동시 요청 경합으로 인해 DataIntegrityViolationException이 발생하면 500/409 에러로 전파하지 말고,
        //    productEventRepository.findByEventId(trimmedEventId)로 선행 저장된 이벤트를 재조회하여
        //    ProductEventRecordResponse.duplicateIgnored(event = concurrentSaved, fallbackEventId = trimmedEventId)를 반환하세요.
        TODO("사용자 미션 1 & 2: ProductEvent 생성 및 eventId 중복 방지(멱등) 저장을 구현하세요.")
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
        // TODO [사용자 미션 3]: 비즈니스 트랜잭션 보호를 위한 예외 격리(Fault Isolation) 구현
        // 1) try 블록에서 recordEvent(authenticatedUserId, request)를 호출해 결과를 반환하세요.
        // 2) 분석 이벤트 검증 또는 저장 중 어떤 Exception이 발생하더라도 외부 비즈니스 트랜잭션으로 전파되지 않도록 catch하고,
        //    log.warn(...)으로 경고를 남긴 뒤 ProductEventRecordResponse.isolatedFailure(request.eventId)를 반환하세요.
        TODO("사용자 미션 3: 분석 이벤트 예외가 핵심 비즈니스 트랜잭션을 실패시키지 않도록 격리하세요.")
    }
}
