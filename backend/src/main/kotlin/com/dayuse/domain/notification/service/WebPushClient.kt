package com.dayuse.domain.notification.service

import nl.martijndwars.webpush.Encoding
import nl.martijndwars.webpush.Notification
import nl.martijndwars.webpush.PushService
import org.apache.http.HttpResponse
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
            // 라이브러리의 send(notification) 기본값은 구 드래프트 인코딩(aesgcm)이다.
            // RFC 8291 표준은 aes128gcm이고, APNs처럼 표준만 받는 푸시 서비스도 있어 명시한다.
            val response = pushService.send(notification, Encoding.AES128GCM)
            val statusCode = response.statusLine.statusCode
            val isSuccess = statusCode in 200..299
            val isExpired = statusCode == 404 || statusCode == 410

            if (!isSuccess && !isExpired) {
                // 만료가 아닌 거부(403 VAPID 키 불일치, 400 잘못된 요청, 429 과다 요청 등)는
                // 구독을 정리해서도 안 되고 재시도해도 같은 결과라, 원인을 남기지 않으면 진단할 방법이 없다.
                log.error(
                    "웹 푸시 전송 거부: status={}, endpoint={}, body={}",
                    statusCode,
                    endpoint,
                    readBody(response)
                )
            }

            PushSendResult(statusCode, isSuccess, isExpired)
        } catch (e: Exception) {
            log.error("웹 푸시 전송 실패: endpoint={}", endpoint, e)
            PushSendResult(statusCode = 500, isSuccess = false, isExpired = false)
        }
    }

    /** 푸시 서비스가 실패 사유를 본문에 담아 주므로 로그에 함께 남긴다. */
    private fun readBody(response: HttpResponse): String = try {
        response.entity
            ?.content
            ?.readAllBytes()
            ?.toString(Charsets.UTF_8)
            ?.trim()
            ?.take(MAX_LOGGED_BODY_LENGTH)
            .orEmpty()
    } catch (e: Exception) {
        "(본문을 읽지 못함: ${e.message})"
    }

    companion object {
        private const val MAX_LOGGED_BODY_LENGTH = 500
    }
}
