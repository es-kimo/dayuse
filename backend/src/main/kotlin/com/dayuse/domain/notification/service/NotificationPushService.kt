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

            // TODO [사용자 미션 2]: W3C Web Push 발송 결과 처리 파이프라인을 완성하세요.
            // 1. result.isSuccess 인 경우 successCount를 1 증가시킵니다.
            // 2. result.isExpired (HTTP 410 Gone 또는 404 Not Found)인 경우, 만료/차단된 기기이므로
            //    subscription.deactivate()를 호출하여 비활성화 상태(isActive = false)로 갱신하세요.
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
