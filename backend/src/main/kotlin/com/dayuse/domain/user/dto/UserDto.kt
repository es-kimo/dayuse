package com.dayuse.domain.user.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class UserResponse(
    val id: Long,
    val kakaoId: String,
    val nickname: String,
    val profileImageUrl: String?
)

data class UpdateNicknameRequest(
    @field:NotBlank(message = "닉네임은 비어있을 수 없습니다.")
    @field:Size(min = 2, max = 20, message = "닉네임은 2자 이상 20자 이하여야 합니다.")
    val nickname: String
)
