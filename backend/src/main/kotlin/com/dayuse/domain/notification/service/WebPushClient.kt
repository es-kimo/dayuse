package com.dayuse.domain.notification.service

import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import java.security.Security

data class PushSendResult(
    val statusCode: Int,
    val isSuccess: Boolean,
    val isExpired: Boolean
)

interface WebPushClient {
    fun send(
        endpoint: String,
        p256dh: String,
        auth: String,
        payloadJson: String
    ): PushSendResult
}

@Component
class DefaultWebPushClient(
    private val properties: WebPushProperties
) : WebPushClient {
    private val log = LoggerFactory.getLogger(javaClass)

    init {
        // Notification 생성자가 KeyFactory.getInstance("ECDH", "BC")를 호출한다.
        // send()는 pushService를 참조하기 전에 Notification을 먼저 만들기 때문에,
        // 프로바이더 등록을 lazy 블록에 두면 lazy가 실행될 기회 없이
        // "no such provider: BC"로 매번 실패한다.
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    private val pushService: PushService by lazy {
        PushService(
            properties.publicKey,
            properties.privateKey,
            properties.subject
        )
    }

    override fun send(
        endpoint: String,
        p256dh: String,
        auth: String,
        payloadJson: String
    ): PushSendResult {
        return try {
            val notification = Notification(endpoint, p256dh, auth, payloadJson.toByteArray(Charsets.UTF_8))
            val response = pushService.send(notification)
            val statusCode = response.statusLine.statusCode
            val isSuccess = statusCode in 200..299
            val isExpired = statusCode == 404 || statusCode == 410
            PushSendResult(statusCode, isSuccess, isExpired)
        } catch (e: Exception) {
            log.error("웹 푸시 전송 실패: endpoint={}, error={}", endpoint, e.message)
            PushSendResult(statusCode = 500, isSuccess = false, isExpired = false)
        }
    }
}
