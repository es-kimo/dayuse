package com.dayuse.domain.notification.service

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

@Component
class WebPushProperties(
    @Value("\${webpush.public-key}")
    val publicKey: String,

    @Value("\${webpush.private-key}")
    val privateKey: String,

    @Value("\${webpush.subject:mailto:support@dayuse.kr}")
    val subject: String
)
