package com.dayuse.domain.user

import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, Long> {
    fun findByKakaoId(kakaoId: String): User?
    fun existsByKakaoId(kakaoId: String): Boolean
}
