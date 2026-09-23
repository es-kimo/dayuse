package com.dayuse.domain.notification.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Pattern

data class NotificationSettingResponse(
    val enabled: Boolean,
    val reminderTime: String,
    val hasActiveSubscription: Boolean,
    val vapidPublicKey: String
)

data class UpdateNotificationSettingRequest(
    @field:NotNull(message = "알림 활성화 여부는 필수입니다.")
    val enabled: Boolean,

    @field:NotBlank(message = "알림 시간은 필수입니다.")
    @field:Pattern(
        regexp = "^([01]\\d|2[0-3]):[0-5]\\d$",
        message = "알림 시간은 HH:mm 형식(00:00 ~ 23:59)이어야 합니다."
    )
    val reminderTime: String
)

data class RegisterPushSubscriptionRequest(
    @field:NotBlank(message = "엔드포인트는 필수입니다.")
    val endpoint: String,

    @field:NotBlank(message = "p256dh 공개키는 필수입니다.")
    val p256dh: String,

    @field:NotBlank(message = "auth 시크릿은 필수입니다.")
    val auth: String
)

data class UnregisterPushSubscriptionRequest(
    @field:NotBlank(message = "엔드포인트는 필수입니다.")
    val endpoint: String
)

data class TestPushResponse(
    val success: Boolean,
    val message: String,
    val sentDeviceCount: Int
)

data class PushPayload(
    val title: String,
    val body: String,
    val url: String = "/today",
    val tag: String = "dayuse-reminder"
)
