package com.dayuse.domain.user

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table

/**
 * [사용자 미션 1-1] User 엔티티 설계 및 구현
 *
 * 요구사항:
 * - id: Long (PK, AUTO_INCREMENT)
 * - kakaoId: String (Unique, 필수)
 * - nickname: String (길이 2~20자, 필수)
 * - profileImageUrl: String? (선택)
 * - BaseTimeEntity 상속 (createdAt, updatedAt)
 * - 닉네임 변경 비즈니스 메서드 (updateNickname)
 */
@Entity
@Table(name = "users")
class User(
    id: Long = 0L,

    @Column(nullable = false, unique = true)
    var kakaoId: String = "",

    @Column(nullable = false, length = 20)
    var nickname: String = "",

    @Column(nullable = true)
    var profileImageUrl: String? = null
) : BaseTimeEntity() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        private set


    // TODO: 필요시 추가 비즈니스 로직(예: 닉네임 유효성 검사, 업데이트 메서드)을 구현해 보세요.
    fun updateNickname(newNickname: String) {
        require(newNickname.length in 2..20) { "닉네임은 2자 이상 20자 이하여야 합니다." }
        this.nickname = newNickname
    }
}
