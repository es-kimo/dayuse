package com.dayuse.domain.share

import com.dayuse.global.entity.BaseTimeEntity
import com.dayuse.global.exception.ForbiddenException
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Lob
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "share_cards",
    indexes = [
        Index(
            name = "idx_share_cards_user_id",
            columnList = "userId"
        ),
        Index(
            name = "idx_share_cards_challenge_id",
            columnList = "challengeId"
        ),
        Index(
            name = "idx_share_cards_verification_id",
            columnList = "verificationId"
        )
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_share_cards_token",
            columnNames = ["token"]
        )
    ]
)
class ShareCard(
    id: Long = 0L,

    @Column(
        nullable = false,
        length = 64,
        unique = true
    )
    var token: String,

    @Enumerated(EnumType.STRING)
    @Column(
        nullable = false,
        length = 30
    )
    var cardType: ShareCardType,

    @Column(nullable = false)
    var userId: Long,

    @Column(nullable = false)
    var challengeId: Long,

    var verificationId: Long? = null,

    @Column(
        nullable = false,
        length = 100
    )
    var title: String,

    @Column(
        nullable = false,
        length = 50
    )
    var userNickname: String,

    @Column(length = 1000)
    var imageUrl: String? = null,

    @Column(length = 500)
    var comment: String? = null,

    @Column(nullable = false)
    var streakDays: Int = 0,

    @Lob
    @Column(columnDefinition = "TEXT")
    var historyJson: String? = null,

    @Column(nullable = false)
    var isActive: Boolean = true
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    fun deactivate() {
        this.isActive = false
    }

    fun validateOwner(requestUserId: Long) {
        if (this.userId != requestUserId) {
            throw ForbiddenException("본인의 공유 카드만 조작할 수 있습니다.")
        }
    }
}
