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

    // TODO [사용자 미션 1-2]: VerificationComment에서 Verification을 참조하는 N:1 연관관계를 지연 로딩(FetchType.LAZY)으로 매핑하세요.
    // ⚠️ 주의: JPA의 @ManyToOne 기본 페치 전략은 EAGER(즉시 로딩)입니다! 불필요한 N+1 즉시 조인을 방지하려면 반드시 fetch = FetchType.LAZY를 명시해야 합니다.
    // 힌트: @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "verification_id", nullable = false)
    @ManyToOne
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
