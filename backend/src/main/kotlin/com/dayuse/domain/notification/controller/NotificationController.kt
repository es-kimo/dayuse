package com.dayuse.domain.notification.controller

import com.dayuse.domain.notification.dto.NotificationSettingResponse
import com.dayuse.domain.notification.dto.RegisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.TestPushResponse
import com.dayuse.domain.notification.dto.UnregisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.UpdateNotificationSettingRequest
import com.dayuse.domain.notification.service.NotificationPushService
import com.dayuse.domain.notification.service.NotificationService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/notifications")
class NotificationController(
    private val notificationService: NotificationService,
    private val notificationPushService: NotificationPushService
) {

    @GetMapping("/settings")
    fun getSettings(@CurrentUserId userId: Long): ResponseEntity<NotificationSettingResponse> {
        val response = notificationService.getSettings(userId)
        return ResponseEntity.ok(response)
    }

    @PutMapping("/settings")
    fun updateSettings(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UpdateNotificationSettingRequest
    ): ResponseEntity<NotificationSettingResponse> {
        val response = notificationService.updateSettings(userId, request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/subscriptions")
    fun registerSubscription(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: RegisterPushSubscriptionRequest
    ): ResponseEntity<Map<String, String>> {
        notificationService.registerSubscription(userId, request)
        return ResponseEntity.ok(mapOf("message" to "푸시 알림 구독이 등록되었습니다."))
    }

    @DeleteMapping("/subscriptions")
    fun unregisterSubscription(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UnregisterPushSubscriptionRequest
    ): ResponseEntity<Map<String, String>> {
        notificationService.unregisterSubscription(userId, request.endpoint)
        return ResponseEntity.ok(mapOf("message" to "푸시 알림 구독이 해제되었습니다."))
    }

    @PostMapping("/test")
    fun sendTestPush(@CurrentUserId userId: Long): ResponseEntity<TestPushResponse> {
        val response = notificationPushService.sendTestPush(userId)
        return ResponseEntity.ok(response)
    }
}
