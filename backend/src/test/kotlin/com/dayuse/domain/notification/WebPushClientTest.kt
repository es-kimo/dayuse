@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.notification

import com.dayuse.domain.notification.service.DefaultWebPushClient
import com.dayuse.domain.notification.service.WebPushProperties
import nl.martijndwars.webpush.Notification
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertDoesNotThrow
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import java.security.Security

/**
 * 웹 푸시 발송은 외부 푸시 서비스(FCM/APNs)를 타므로 통합 테스트에서는 FakeWebPushClient로 대체된다.
 * 그래서 실제 구현체가 BouncyCastle 프로바이더를 제때 등록하는지는 여기서만 검증할 수 있다.
 */
class WebPushClientTest {

    // 브라우저가 실제로 내려주는 형식과 같은 표준 base64(패딩 포함) 값이다.
    private val p256dh = "BAeElOmdxdmx7hyJnTEUJQlP0btIHfPeoRbFnk3d2+euJj0TH2JzrIQ/CqL/dHG62zW9OvxzrcJH4fa35ENz7Kc="
    private val auth = "HYxQLJgaA2oWLj5hmSV9JQ=="

    private val properties = WebPushProperties(
        publicKey = "BF5PuGK_jwgfQpNNUcTf75z93uuqrwrN1yl4Vkxnhsfi0vWu_dX6vOxFY6DXUyiWVTxqIxz4-Jwz3gGBD-om-EA",
        privateKey = "NghqENb7xUAkfU6oc9QJJSjNbO1BRPRMOK_rtJqYjNA",
        subject = "mailto:test@dayuse.kr"
    )

    @BeforeEach
    fun removeProvider() {
        // 다른 테스트가 먼저 등록해 둔 상태에 기대지 않도록 매번 지운 뒤 시작한다.
        Security.removeProvider(BouncyCastleProvider.PROVIDER_NAME)
    }

    @AfterEach
    fun restoreProvider() {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(BouncyCastleProvider())
        }
    }

    @Test
    @DisplayName("클라이언트를 생성하면 BouncyCastle 프로바이더가 즉시 등록된다")
    fun registersBouncyCastleOnConstruction() {
        DefaultWebPushClient(properties)

        assertNotNull(Security.getProvider(BouncyCastleProvider.PROVIDER_NAME))
    }

    @Test
    @DisplayName("클라이언트 생성 직후 구독 키로 Notification을 만들 수 있다 (no such provider: BC 회귀)")
    fun buildsNotificationWithoutProviderError() {
        DefaultWebPushClient(properties)

        // Notification 생성자는 KeyFactory.getInstance("ECDH", "BC")를 호출한다.
        // 프로바이더 등록이 늦으면 여기서 NoSuchProviderException이 난다.
        assertDoesNotThrow {
            Notification(
                "https://fcm.googleapis.com/fcm/send/test-endpoint",
                p256dh,
                auth,
                """{"title":"t","body":"b"}""".toByteArray(Charsets.UTF_8)
            )
        }
    }
}
