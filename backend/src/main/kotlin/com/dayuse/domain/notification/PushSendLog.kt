package com.dayuse.domain.notification

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(
    name = "push_send_logs",
    indexes = [
        Index(name = "idx_push_send_logs_user_date", columnList = "userId, sendDate")
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_push_send_logs_user_send_date", columnNames = ["userId", "sendDate"])
    ]
)
class PushSendLog(
    id: Long = 0L,

    @Column(nullable = false)
    var userId: Long,

    @Column(nullable = false)
    var sendDate: LocalDate,

    @Column(nullable = false)
    var pendingChallengeCount: Int,

    @Column(nullable = false)
    var sentAt: LocalDateTime = LocalDateTime.now()
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set
}
