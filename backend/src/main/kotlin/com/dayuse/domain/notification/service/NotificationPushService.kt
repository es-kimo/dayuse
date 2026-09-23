package com.dayuse.domain.notification.service

import com.dayuse.domain.notification.PushSubscriptionRepository
import com.dayuse.domain.notification.dto.PushPayload
import com.dayuse.domain.notification.dto.TestPushResponse
import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class NotificationPushService(
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val webPushClient: WebPushClient,
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun sendPushToUser(userId: Long, payload: PushPayload): Int {
        val subscriptions = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(userId)
        if (subscriptions.isEmpty()) {
            return 0
        }

        val payloadJson = objectMapper.writeValueAsString(payload)
        var successCount = 0

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
                log.info("만료된 웹 푸시 구독 비활성화 처리: subscriptionId={}, endpoint={}", subscription.id, subscription.endpoint)
                subscription.deactivate()
            }
        }

        return successCount
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

        val sentCount = sendPushToUser(userId, testPayload)
        return TestPushResponse(
            success = sentCount > 0,
            message = if (sentCount > 0) "테스트 알림이 전송되었습니다." else "알림 전송에 실패했습니다. 기기 권한을 확인해 주세요.",
            sentDeviceCount = sentCount
        )
    }
}
