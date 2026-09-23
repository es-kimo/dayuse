package com.dayuse.domain.notification

import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.time.LocalTime

interface PushSubscriptionRepository : JpaRepository<PushSubscription, Long> {
    fun findByEndpoint(endpoint: String): PushSubscription?
    fun findAllByUserIdAndIsActiveTrue(userId: Long): List<PushSubscription>
    fun findAllByUserId(userId: Long): List<PushSubscription>
    fun deleteByEndpointAndUserId(endpoint: String, userId: Long): Long
}

interface UserNotificationSettingRepository : JpaRepository<UserNotificationSetting, Long> {
    fun findByUserId(userId: Long): UserNotificationSetting?
    fun findAllByEnabledTrueAndReminderTime(reminderTime: LocalTime): List<UserNotificationSetting>
}

interface PushSendLogRepository : JpaRepository<PushSendLog, Long> {
    fun existsByUserIdAndSendDate(userId: Long, sendDate: LocalDate): Boolean
}
