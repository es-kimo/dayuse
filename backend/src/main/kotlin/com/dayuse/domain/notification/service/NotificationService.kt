package com.dayuse.domain.notification.service

import com.dayuse.domain.notification.PushSubscription
import com.dayuse.domain.notification.PushSubscriptionRepository
import com.dayuse.domain.notification.UserNotificationSetting
import com.dayuse.domain.notification.UserNotificationSettingRepository
import com.dayuse.domain.notification.dto.NotificationSettingResponse
import com.dayuse.domain.notification.dto.RegisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.UpdateNotificationSettingRequest
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalTime
import java.time.format.DateTimeFormatter

@Service
class NotificationService(
    private val userNotificationSettingRepository: UserNotificationSettingRepository,
    private val pushSubscriptionRepository: PushSubscriptionRepository,
    private val webPushProperties: WebPushProperties
) {
    private val timeFormatter = DateTimeFormatter.ofPattern("HH:mm")

    @Transactional(readOnly = true)
    fun getSettings(userId: Long): NotificationSettingResponse {
        val setting = userNotificationSettingRepository.findByUserId(userId)
        val hasActiveSubscription = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(userId).isNotEmpty()

        val enabled = setting?.enabled ?: false
        val reminderTime = (setting?.reminderTime ?: LocalTime.of(21, 0)).format(timeFormatter)

        return NotificationSettingResponse(
            enabled = enabled,
            reminderTime = reminderTime,
            hasActiveSubscription = hasActiveSubscription,
            vapidPublicKey = webPushProperties.publicKey
        )
    }

    @Transactional
    fun updateSettings(userId: Long, request: UpdateNotificationSettingRequest): NotificationSettingResponse {
        val parsedTime = LocalTime.parse(request.reminderTime, timeFormatter)
        val setting = userNotificationSettingRepository.findByIdOrNull(userId)
            ?: UserNotificationSetting(userId = userId)

        setting.update(enabled = request.enabled, reminderTime = parsedTime)
        userNotificationSettingRepository.save(setting)

        val hasActiveSubscription = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(userId).isNotEmpty()

        return NotificationSettingResponse(
            enabled = setting.enabled,
            reminderTime = setting.reminderTime.format(timeFormatter),
            hasActiveSubscription = hasActiveSubscription,
            vapidPublicKey = webPushProperties.publicKey
        )
    }

    @Transactional
    fun registerSubscription(userId: Long, request: RegisterPushSubscriptionRequest) {
        val existing = pushSubscriptionRepository.findByEndpoint(request.endpoint)
        if (existing != null) {
            existing.userId = userId
            existing.activate(p256dh = request.p256dh, auth = request.auth)
            pushSubscriptionRepository.save(existing)
        } else {
            val newSubscription = PushSubscription(
                userId = userId,
                endpoint = request.endpoint,
                p256dh = request.p256dh,
                auth = request.auth,
                isActive = true
            )
            pushSubscriptionRepository.save(newSubscription)
        }
    }

    @Transactional
    fun unregisterSubscription(userId: Long, endpoint: String) {
        val subscription = pushSubscriptionRepository.findByEndpoint(endpoint)
        if (subscription != null && subscription.userId == userId) {
            subscription.deactivate()
        }
    }
}
