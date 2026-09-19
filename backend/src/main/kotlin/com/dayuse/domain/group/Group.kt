package com.dayuse.domain.group

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * [사용자 미션 1-2] Group 엔티티 설계 및 구현
 *
 * 요구사항:
 * - id: Long (PK, AUTO_INCREMENT)
 * - name: String (길이 1~50자, 필수)
 * - hostUserId: Long (모임장의 User ID)
 * - inviteCode: String (Unique, 필수)
 * - inviteCodeIssuedAt: LocalDateTime (발급 시각)
 * - BaseTimeEntity 상속
 * - 초대 코드 재발급 메서드 (refreshInviteCode)
 */
@Entity
@Table(name = "`groups`")
class Group(
    id: Long = 0L,

    @Column(nullable = false, length = 50)
    var name: String = "",

    @Column(nullable = false)
    var hostUserId: Long = 0L,

    @Column(nullable = false, unique = true)
    var inviteCode: String = "",

    @Column(nullable = false)
    var inviteCodeIssuedAt: LocalDateTime = LocalDateTime.now()
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set


    // TODO: 초대 코드 재발급 시 inviteCode와 발급 시간을 갱신하는 비즈니스 메서드를 완성해 보세요.
    fun refreshInviteCode(newInviteCode: String) {
        this.inviteCode = newInviteCode
        this.inviteCodeIssuedAt = LocalDateTime.now()
    }
}
