package com.dayuse.domain.notification.service

import com.dayuse.domain.notification.PushSubscriptionRepository
import com.dayuse.domain.notification.dto.PushPayload
import com.dayuse.domain.notification.dto.TestPushResponse
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * 한 사용자에게 보낸 결과. 실패를 "만료된 구독"과 "푸시 서비스의 거부"로 나눈다.
 * 전자는 사용자가 알림을 다시 켜야 풀리고, 후자는 서버 쪽 문제라 안내가 달라야 한다.
 */
data class PushDispatchResult(
    val successCount: Int,
    val expiredCount: Int,
    val rejectedCount: Int
)

@Service
class NotificationPushService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val webPushClient: WebPushClient,
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun sendPushToUser(
        userId: Long,
        payload: PushPayload
    ): PushDispatchResult {
        val subscriptions = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(userId)
        if (subscriptions.isEmpty()) {
            return PushDispatchResult(0, 0, 0)
        }

        val payloadJson = objectMapper.writeValueAsString(payload)
        var successCount = 0
        var expiredCount = 0
        var rejectedCount = 0

        for (subscription in subscriptions) {
            val result = webPushClient.send(
                endpoint = subscription.endpoint,
                p256dh = subscription.p256dh,
                auth = subscription.auth,
                payloadJson = payloadJson
            )

            if (result.isSuccess) {
                successCount++
            } else if (result.isExpired) {
                expiredCount++
                log.info(
                    "만료된 웹 푸시 구독 비활성화 처리: subscriptionId={}, endpoint={}",
                    subscription.id,
                    subscription.endpoint
                )
                subscription.deactivate()
            } else {
                // 구독은 살아 있는데 푸시 서비스가 받아주지 않은 경우다. 비활성화하면 안 된다.
                rejectedCount++
            }
        }
        return PushDispatchResult(successCount, expiredCount, rejectedCount)
    }

    @Transactional
    fun sendTestPush(userId: Long): TestPushResponse {
        val subscriptions = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(userId)
        if (subscriptions.isEmpty()) {
            return TestPushResponse(
                success = false,
                message = "등록된 알림 기기가 없습니다. 브라우저 알림 권한을 켠 후 다시 시도해 주세요.",
                sentDeviceCount = 0
            )
        }

        val testPayload = PushPayload(
            title = "dayuse 테스트 알림",
            body = "알림 설정이 정상적으로 완료되었습니다! 매일 지정하신 시간에 리마인더를 보내드릴게요.",
            url = "/today",
            tag = "dayuse-test"
        )

        val result = sendPushToUser(
            userId,
            testPayload
        )
        return TestPushResponse(
            success = result.successCount > 0,
            message = when {
                result.successCount > 0 -> "테스트 알림이 전송되었습니다."
                result.expiredCount > 0 -> "이 기기의 구독이 만료되었습니다. 알림을 껐다가 다시 켜 주세요."
                else -> "푸시 서버가 발송을 거부했습니다. 잠시 후 다시 시도해 주세요."
            },
            sentDeviceCount = result.successCount
        )
    }
}
