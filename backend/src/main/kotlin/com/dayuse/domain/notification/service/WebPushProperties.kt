package com.dayuse.domain.notification.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class WebPushProperties(
    @Value("\${webpush.public-key:BF5PuGK_jwgfQpNNUcTf75z93uuqrwrN1yl4Vkxnhsfi0vWu_dX6vOxFY6DXUyiWVTxqIxz4-Jwz3gGBD-om-EA}")
    val publicKey: String,

    @Value("\${webpush.private-key:NghqENb7xUAkfU6oc9QJJSjNbO1BRPRMOK_rtJqYjNA}")
    val privateKey: String,

    @Value("\${webpush.subject:mailto:support@dayuse.kr}")
    val subject: String
)
