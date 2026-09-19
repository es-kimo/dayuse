package com.dayuse.domain.verification

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(
    name = "verification_comments",
    indexes = [
        Index(name = "idx_comment_verification_id", columnList = "verification_id"),
        Index(name = "idx_comment_user_id", columnList = "userId")
    ]
)
class VerificationComment(
    id: Long = 0L,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verification_id", nullable = false)
    var verification: Verification,

    userId: Long = 0L,

    @Column(nullable = false, length = 300)
    var content: String = ""
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        private set

    @Column(nullable = false)
    var userId: Long = userId
        private set
}
