package com.dayuse.domain.notification.scheduler

import com.dayuse.domain.notification.service.NotificationSchedulerService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class NotificationScheduler(
    private val notificationSchedulerService: NotificationSchedulerService
) {

    @Scheduled(cron = "0 * * * * *", zone = "Asia/Seoul")
    fun runNotificationJob() {
        notificationSchedulerService.processScheduledNotifications()
    }
}
