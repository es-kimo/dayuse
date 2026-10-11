package com.dayuse.domain.analytics.service

import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Component
import java.time.LocalDate

/**
 * 챌린지 결과 및 코인 이벤트의 서버 측 적재기. (v0.13 F09)
 *
 * ### 왜 서버에서 기록하는가
 * - 코인 자동 지급(`challenge_coin_granted`) 및 보정(`challenge_coin_adjusted`),
 *   그리고 결과 확인 확정(`challenge_result_acknowledged`)은 서버 트랜잭션 성공 기준의 신뢰할 수 있는 단일 진실 원천(SSOT)이다.
 * - 클라이언트의 재시도나 중복 요청에도 분석 데이터가 오염되지 않도록
 *   서버 처리 식별자 기반의 결정적 `eventId`를 생성하여 `ProductEvent.eventId` UNIQUE 제약에 의해 멱등하게 처리한다.
 */
@Component
class ChallengeAnalyticsRecorder(
    private val productEventService: ProductEventService
) {

    /**
     * 최초 코인 자동 지급 성공 시 기록.
     * 챌린지·사용자·적격일자 조합으로 결정적 eventId를 부여하여 중복 집계를 원천 차단한다.
     */
    fun challengeCoinGranted(
        userId: Long,
        challengeId: Long,
        amount: Int,
        targetDate: LocalDate
    ) {
        val eventId = deterministicId(
            ProductEventName.CHALLENGE_COIN_GRANTED,
            "c${challengeId}-u${userId}-d${targetDate}"
        )
        record(
            eventName = ProductEventName.CHALLENGE_COIN_GRANTED,
            userId = userId,
            eventId = eventId,
            properties = mapOf(
                "challengeId" to challengeId,
                "amount" to amount,
                "targetDate" to targetDate.toString()
            )
        )
    }

    /**
     * 인증 취소/삭제에 따른 코인 차액 보정 성공 시 기록.
     * 보정 트랜잭션 ID로 결정적 eventId를 부여한다.
     */
    fun challengeCoinAdjusted(
        userId: Long,
        challengeId: Long?,
        transactionId: Long,
        amount: Int,
        targetDate: LocalDate,
        type: String,
        balanceAfter: Int
    ) {
        val eventId = deterministicId(
            ProductEventName.CHALLENGE_COIN_ADJUSTED,
            "tx$transactionId"
        )
        val props = mutableMapOf<String, Any?>(
            "transactionId" to transactionId,
            "amount" to amount,
            "targetDate" to targetDate.toString(),
            "type" to type,
            "balanceAfter" to balanceAfter
        )
        if (challengeId != null) {
            props["challengeId"] = challengeId
        }

        record(
            eventName = ProductEventName.CHALLENGE_COIN_ADJUSTED,
            userId = userId,
            eventId = eventId,
            properties = props
        )
    }

    /**
     * 확정 결과 확인 상태 저장 성공 시 기록.
     * 챌린지·사용자·리비전 조합으로 결정적 eventId를 부여한다.
     */
    fun challengeResultAcknowledged(
        userId: Long,
        challengeId: Long,
        groupId: Long,
        revision: Int,
        lateCount: Int,
        coinRewardCount: Int,
        coinGrantStatus: String
    ) {
        val eventId = deterministicId(
            ProductEventName.CHALLENGE_RESULT_ACKNOWLEDGED,
            "c${challengeId}-u${userId}-r${revision}"
        )
        record(
            eventName = ProductEventName.CHALLENGE_RESULT_ACKNOWLEDGED,
            userId = userId,
            eventId = eventId,
            properties = mapOf(
                "challengeId" to challengeId,
                "groupId" to groupId,
                "revision" to revision,
                "lateCount" to lateCount,
                "coinRewardCount" to coinRewardCount,
                "coinGrantStatus" to coinGrantStatus
            )
        )
    }

    private fun record(
        eventName: ProductEventName,
        userId: Long,
        eventId: String,
        properties: Map<String, Any?>
    ) {
        productEventService.recordEventSafely(
            authenticatedUserId = userId,
            request = ProductEventCreateRequest(
                eventId = eventId,
                eventName = eventName.value,
                occurredAt = DateTimeUtils.nowKst().toString(),
                sessionId = SERVER_SESSION_ID,
                appVersion = SERVER_APP_VERSION,
                properties = properties
            )
        )
    }

    private fun deterministicId(eventName: ProductEventName, referenceKey: String): String =
        "${eventName.value}-$referenceKey".take(MAX_EVENT_ID_LENGTH)

    companion object {
        const val SERVER_SESSION_ID = "server-challenge-result"
        const val SERVER_APP_VERSION = "server"
        private const val MAX_EVENT_ID_LENGTH = 64
    }
}
