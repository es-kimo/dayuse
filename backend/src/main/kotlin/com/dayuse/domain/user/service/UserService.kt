package com.dayuse.domain.user.service

import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.user.dto.UserResponse
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class UserService(
    private val userRepository: UserRepository
) {

    fun getMe(userId: Long): UserResponse {
        val user = findUserById(userId)
        return user.toResponse()
    }

    @Transactional
    fun updateProfile(userId: Long, newNickname: String?, newProfileImageUrl: String?): UserResponse {
        val user = findUserById(userId)
        user.updateProfile(newNickname, newProfileImageUrl)
        return user.toResponse()
    }

    @Transactional
    fun updateNickname(userId: Long, newNickname: String): UserResponse {
        return updateProfile(userId, newNickname, null)
    }

    fun findUserById(userId: Long): User {
        return userRepository.findById(userId).orElseThrow {
            ResourceNotFoundException("사용자를 찾을 수 없습니다. (ID: $userId)")
        }
    }

    private fun User.toResponse() = UserResponse(
        id = id,
        kakaoId = kakaoId,
        nickname = nickname,
        profileImageUrl = profileImageUrl
    )
}
