package com.dayuse.domain.notification

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime
import java.time.LocalTime

@Entity
@Table(name = "user_notification_settings")
class UserNotificationSetting(
    @Id
    var userId: Long = 0L,

    @Column(nullable = false)
    var enabled: Boolean = false,

    @Column(nullable = false)
    var reminderTime: LocalTime = LocalTime.of(21, 0),

    @Column(nullable = false)
    var updatedAt: LocalDateTime = LocalDateTime.now()
) {
    fun update(enabled: Boolean, reminderTime: LocalTime) {
        this.enabled = enabled
        this.reminderTime = reminderTime
        this.updatedAt = LocalDateTime.now()
    }
}
