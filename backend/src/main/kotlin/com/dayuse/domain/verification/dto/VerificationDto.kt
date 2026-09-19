package com.dayuse.domain.verification.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import jakarta.validation.constraints.Size
import java.time.LocalDate
import java.time.LocalDateTime

data class CreateVerificationRequest(
    @field:NotNull(message = "챌린지 ID는 필수입니다.")
    val challengeId: Long,

    @field:NotBlank(message = "이미지 URL은 필수입니다.")
    val imageUrl: String,

    @field:Size(max = 200, message = "인증 한마디는 200자 이하여야 합니다.")
    val comment: String? = null,

    val targetDate: LocalDate? = null
)

data class UpdateVerificationRequest(
    val imageUrl: String? = null,

    @field:Size(max = 200, message = "인증 한마디는 200자 이하여야 합니다.")
    val comment: String? = null
)

data class VerificationDetailResponse(
    val id: Long,
    val groupId: Long,
    val challengeId: Long,
    val userId: Long,
    val targetDate: LocalDate,
    val imageUrl: String,
    val comment: String?,
    val isLate: Boolean,
    val createdAt: LocalDateTime,
    val updatedAt: LocalDateTime
)
