package com.dayuse.domain.verification

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.CascadeType
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import org.hibernate.annotations.BatchSize
import java.time.LocalDate

@Entity
@Table(
    name = "verifications",
    indexes = [
        Index(name = "idx_verification_group_id", columnList = "groupId"),
        Index(name = "idx_verification_challenge_id", columnList = "challengeId"),
        Index(name = "idx_verification_user_id", columnList = "userId"),
        Index(name = "idx_verification_target_date", columnList = "targetDate")
    ],
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_verification_challenge_user_date",
            columnNames = ["challengeId", "userId", "targetDate"]
        )
    ]
)
class Verification(
    id: Long = 0L,

    groupId: Long = 0L,

    challengeId: Long = 0L,

    userId: Long = 0L,

    @Column(nullable = false)
    var targetDate: LocalDate = LocalDate.now(),

    @Column(nullable = false, length = 1000)
    var imageUrl: String = "",

    @Column(length = 200)
    var comment: String? = null,

    @Column(nullable = false)
    var isLate: Boolean = false
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        private set

    @Column(nullable = false)
    var groupId: Long = groupId
        private set

    @Column(nullable = false)
    var challengeId: Long = challengeId
        private set

    @Column(nullable = false)
    var userId: Long = userId
        private set

    @BatchSize(size = 100)
    @OneToMany(mappedBy = "verification", fetch = FetchType.LAZY, cascade = [CascadeType.ALL], orphanRemoval = true)
    var comments: MutableList<VerificationComment> = mutableListOf()

    fun addComment(comment: VerificationComment) {
        comments.add(comment)
    }

    fun update(imageUrl: String?, comment: String?) {
        if (!imageUrl.isNullOrBlank()) {
            this.imageUrl = imageUrl
        }
        if (comment != null) {
            this.comment = comment
        }
    }
}
