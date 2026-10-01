package com.dayuse.domain.analytics.service

import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Component
import java.util.UUID

/**
 * 리데이·광고·티켓 이벤트의 서버 측 적재기. (v0.11 F13)
 *
 * ### 왜 서버에서 기록하는가
 * 지급(`reward_granted`, `recovery_ticket_granted`)·사용(`recovery_ticket_used`)·완료(`recovery_completed`)는
 * 클라이언트가 재시도할 수 있다. 서버는 이 재시도에 같은 멱등 응답을 돌려주므로,
 * 클라이언트가 응답을 받을 때마다 이벤트를 쏘면 지급 1건이 N건으로 집계된다.
 * 그래서 이 이벤트들은 **서버가 실제로 최초 처리한 순간에만** 기록한다.
 *
 * ### 중복 적재를 막는 장치
 * `eventId`를 서버 처리 결과물의 식별자로 **결정적으로** 만든다
 * (예: `reward_granted-rh42`, `recovery_ticket_used-t7`).
 * 같은 지급/사용 건에서 이벤트 기록이 두 번 시도되면 `ProductEvent.eventId` UNIQUE 제약과
 * [ProductEventService.recordEvent]의 멱등 처리에 걸려 `duplicate_ignored`가 되고 행이 늘지 않는다.
 * 시도 자체가 집계 대상인 이벤트(`ad_requested`, `ad_unavailable`, `recovery_failed`)만 임의 `eventId`를 쓴다.
 *
 * ### 보상 수량 집계 주의
 * `reward_granted`와 `recovery_ticket_granted`는 같은 지급 1건의 서로 다른 단면이며
 * `rewardHistoryId`와 `ticketId`로 서로를 참조한다. 두 이벤트 수를 더하면 보상 수량이 2배가 된다.
 *
 * 개인정보(인증 이미지·인증 문구·닉네임·계좌정보)와 세션 토큰은 어떤 속성에도 넣지 않는다.
 * 내부 숫자 식별자만 싣는다.
 */
@Component
class RedayAnalyticsRecorder(
    private val productEventService: ProductEventService
) {

    fun lateCertificationCompleted(
        userId: Long,
        verificationId: Long,
        dailyRecordId: Long,
        challengeId: Long,
        penaltyAmount: Int,
        redayEligible: Boolean
    ) {
        record(
            eventName = ProductEventName.LATE_CERTIFICATION_COMPLETED,
            userId = userId,
            eventId = deterministicId(ProductEventName.LATE_CERTIFICATION_COMPLETED, "v$verificationId"),
            properties = mapOf(
                "verificationId" to verificationId,
                "dailyRecordId" to dailyRecordId,
                "challengeId" to challengeId,
                "penaltyAmount" to penaltyAmount,
                "redayEligible" to redayEligible
            )
        )
    }

    fun recoveryOffered(
        userId: Long,
        dailyRecordId: Long,
        challengeId: Long,
        penaltyAmount: Int,
        availableTicketCount: Long
    ) {
        record(
            eventName = ProductEventName.RECOVERY_OFFERED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_OFFERED, "r$dailyRecordId"),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "challengeId" to challengeId,
                "penaltyAmount" to penaltyAmount,
                "availableTicketCount" to availableTicketCount
            )
        )
    }

    /** 세션 발급 시도. 같은 사용자가 중단 후 다시 요청하면 별개 시도이므로 임의 eventId를 쓴다. */
    fun adRequested(userId: Long, dailyRecordId: Long, slotType: String) {
        record(
            eventName = ProductEventName.AD_REQUESTED,
            userId = userId,
            eventId = randomId(ProductEventName.AD_REQUESTED),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "slotType" to slotType
            )
        )
    }

    fun adServed(userId: Long, sessionId: Long, dailyRecordId: Long, campaignId: Long, creativeId: Long, requiredWatchSeconds: Int) {
        record(
            eventName = ProductEventName.AD_SERVED,
            userId = userId,
            eventId = deterministicId(ProductEventName.AD_SERVED, "s$sessionId"),
            properties = mapOf(
                "adSessionId" to sessionId,
                "dailyRecordId" to dailyRecordId,
                "campaignId" to campaignId,
                "creativeId" to creativeId,
                "requiredWatchSeconds" to requiredWatchSeconds
            )
        )
    }

    fun adUnavailable(userId: Long, dailyRecordId: Long, reason: String) {
        record(
            eventName = ProductEventName.AD_UNAVAILABLE,
            userId = userId,
            eventId = randomId(ProductEventName.AD_UNAVAILABLE),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "reason" to reason
            )
        )
    }

    /** 세션당 최초 노출에서만 호출한다. */
    fun adImpression(userId: Long, sessionId: Long, dailyRecordId: Long, campaignId: Long, creativeId: Long) {
        record(
            eventName = ProductEventName.AD_IMPRESSION,
            userId = userId,
            eventId = deterministicId(ProductEventName.AD_IMPRESSION, "s$sessionId"),
            properties = mapOf(
                "adSessionId" to sessionId,
                "dailyRecordId" to dailyRecordId,
                "campaignId" to campaignId,
                "creativeId" to creativeId
            )
        )
    }

    /** 세션이 실제로 중단 상태로 전환된 경우에만 호출한다. */
    fun adAbandoned(userId: Long, sessionId: Long, dailyRecordId: Long, impressed: Boolean) {
        record(
            eventName = ProductEventName.AD_ABANDONED,
            userId = userId,
            eventId = deterministicId(ProductEventName.AD_ABANDONED, "s$sessionId"),
            properties = mapOf(
                "adSessionId" to sessionId,
                "dailyRecordId" to dailyRecordId,
                "impressed" to impressed
            )
        )
    }

    /**
     * 광고 완료 및 보상 지급 1건을 한 묶음으로 기록한다. 서버가 실제로 최초 지급한 경우에만 호출한다.
     *
     * `ad_completed` → `reward_granted` → `recovery_ticket_granted` 순서로 같은 지급 건을 가리키며,
     * `reward_granted`와 `recovery_ticket_granted`는 `rewardHistoryId`/`ticketId`로 서로를 참조한다.
     */
    fun adCompletedWithReward(
        userId: Long,
        sessionId: Long,
        dailyRecordId: Long,
        campaignId: Long,
        rewardHistoryId: Long,
        ticketId: Long,
        targetRecordDeadlineExpired: Boolean
    ) {
        record(
            eventName = ProductEventName.AD_COMPLETED,
            userId = userId,
            eventId = deterministicId(ProductEventName.AD_COMPLETED, "s$sessionId"),
            properties = mapOf(
                "adSessionId" to sessionId,
                "dailyRecordId" to dailyRecordId,
                "campaignId" to campaignId
            )
        )
        record(
            eventName = ProductEventName.REWARD_GRANTED,
            userId = userId,
            eventId = deterministicId(ProductEventName.REWARD_GRANTED, "rh$rewardHistoryId"),
            properties = mapOf(
                "rewardHistoryId" to rewardHistoryId,
                "ticketId" to ticketId,
                "adSessionId" to sessionId,
                "dailyRecordId" to dailyRecordId,
                "rewardTicketCount" to 1,
                "targetRecordDeadlineExpired" to targetRecordDeadlineExpired
            )
        )
        record(
            eventName = ProductEventName.RECOVERY_TICKET_GRANTED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_TICKET_GRANTED, "t$ticketId"),
            properties = mapOf(
                "ticketId" to ticketId,
                "rewardHistoryId" to rewardHistoryId,
                "adSessionId" to sessionId,
                "source" to "REWARD_AD"
            )
        )
    }

    /** 광고 외 경로(관리자 지급 등)의 티켓 발급. */
    fun recoveryTicketGranted(userId: Long, ticketId: Long, source: String) {
        record(
            eventName = ProductEventName.RECOVERY_TICKET_GRANTED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_TICKET_GRANTED, "t$ticketId"),
            properties = mapOf(
                "ticketId" to ticketId,
                "source" to source
            )
        )
    }

    /**
     * 티켓 소비와 리데이 완료를 기록한다. 서버가 실제로 최초 소비한 경우에만 호출한다.
     * 멱등 응답(이미 적용된 기록의 재시도)에서는 호출하지 않으며, 호출되더라도
     * `eventId`가 티켓/기록 식별자로 고정되어 있어 행이 늘지 않는다.
     */
    fun recoveryTicketUsedAndCompleted(
        userId: Long,
        ticketId: Long,
        dailyRecordId: Long,
        challengeId: Long,
        exemptedPenaltyAmount: Int
    ) {
        record(
            eventName = ProductEventName.RECOVERY_TICKET_USED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_TICKET_USED, "t$ticketId"),
            properties = mapOf(
                "ticketId" to ticketId,
                "dailyRecordId" to dailyRecordId,
                "challengeId" to challengeId
            )
        )
        record(
            eventName = ProductEventName.RECOVERY_COMPLETED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_COMPLETED, "r$dailyRecordId"),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "challengeId" to challengeId,
                "ticketId" to ticketId,
                "exemptedPenaltyAmount" to exemptedPenaltyAmount
            )
        )
    }

    fun recoveryExpired(userId: Long, dailyRecordId: Long, challengeId: Long, penaltyAmount: Int) {
        record(
            eventName = ProductEventName.RECOVERY_EXPIRED,
            userId = userId,
            eventId = deterministicId(ProductEventName.RECOVERY_EXPIRED, "r$dailyRecordId"),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "challengeId" to challengeId,
                "penaltyAmount" to penaltyAmount
            )
        )
    }

    /** 실패는 시도 단위 집계 대상이므로 임의 eventId를 쓴다. 서버 메시지 원문은 싣지 않는다. */
    fun recoveryFailed(userId: Long, dailyRecordId: Long?, step: String, reason: String) {
        record(
            eventName = ProductEventName.RECOVERY_FAILED,
            userId = userId,
            eventId = randomId(ProductEventName.RECOVERY_FAILED),
            properties = mapOf(
                "dailyRecordId" to dailyRecordId,
                "step" to step,
                "reason" to reason
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

    /** eventId는 64자 제한이다. 이벤트 이름과 처리 결과물 식별자 조합은 그 안에 충분히 들어간다. */
    private fun deterministicId(eventName: ProductEventName, referenceKey: String): String =
        "${eventName.value}-$referenceKey".take(MAX_EVENT_ID_LENGTH)

    private fun randomId(eventName: ProductEventName): String =
        "${eventName.value}-${UUID.randomUUID()}".take(MAX_EVENT_ID_LENGTH)

    companion object {
        /** 서버가 적재한 이벤트임을 구분하기 위한 고정 세션 식별자. */
        const val SERVER_SESSION_ID = "server-reday"
        const val SERVER_APP_VERSION = "server"
        private const val MAX_EVENT_ID_LENGTH = 64
    }
}
