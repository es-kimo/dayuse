package com.dayuse.domain.auth.dto

data class KakaoUserDto(
    val kakaoId: String,
    val nickname: String,
    val profileImageUrl: String? = null
)
