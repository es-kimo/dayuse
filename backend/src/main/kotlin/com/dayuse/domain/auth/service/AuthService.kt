package com.dayuse.domain.auth.service

import com.dayuse.domain.auth.client.KakaoAuthClient
import com.dayuse.domain.auth.dto.KakaoLoginRequest
import com.dayuse.domain.auth.dto.RefreshTokenRequest
import com.dayuse.domain.auth.dto.TokenResponse
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.user.dto.UserResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.jwt.JwtTokenProvider
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

data class AuthResult(
    val accessToken: String,
    val refreshToken: String,
    val user: UserResponse
)

@Service
@Transactional
class AuthService(
    private val kakaoAuthClient: KakaoAuthClient,
    private val userRepository: UserRepository,
    private val jwtTokenProvider: JwtTokenProvider
) {

    fun loginWithKakao(request: KakaoLoginRequest): AuthResult {
        val kakaoUserInfo = kakaoAuthClient.getUserInfo(request.code, request.redirectUri)

        val user = userRepository.findByKakaoId(kakaoUserInfo.kakaoId)
            ?: userRepository.save(
                User(
                    kakaoId = kakaoUserInfo.kakaoId,
                    nickname = kakaoUserInfo.nickname,
                    profileImageUrl = kakaoUserInfo.profileImageUrl
                )
            )

        val accessToken = jwtTokenProvider.generateAccessToken(user.id)
        val refreshToken = jwtTokenProvider.generateRefreshToken(user.id)

        return AuthResult(
            accessToken = accessToken,
            refreshToken = refreshToken,
            user = UserResponse(
                id = user.id,
                kakaoId = user.kakaoId,
                nickname = user.nickname,
                profileImageUrl = user.profileImageUrl
            )
        )
    }

    @Transactional(readOnly = true)
    fun refreshToken(request: RefreshTokenRequest): TokenResponse {
        val token = request.refreshToken
        if (!jwtTokenProvider.validateToken(token)) {
            throw BadRequestException("유효하지 않거나 만료된 Refresh Token입니다.")
        }

        val userId = jwtTokenProvider.getUserIdFromToken(token)
        val newAccessToken = jwtTokenProvider.generateAccessToken(userId)
        val newRefreshToken = jwtTokenProvider.generateRefreshToken(userId)

        return TokenResponse(
            accessToken = newAccessToken,
            refreshToken = newRefreshToken
        )
    }
}
