package com.dayuse.domain.auth.dto

import jakarta.validation.constraints.NotBlank

data class KakaoLoginRequest(
    @field:NotBlank(message = "카카오 인가 코드는 필수입니다.")
    val code: String,
    val redirectUri: String? = null
)
