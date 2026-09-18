package com.dayuse.domain.auth.dto

import jakarta.validation.constraints.NotBlank

data class RefreshTokenRequest(
    @field:NotBlank(message = "Refresh Token은 필수입니다.")
    val refreshToken: String
)
