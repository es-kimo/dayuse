package com.dayuse.domain.verification.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

data class PresignedUrlRequest(
    @field:NotNull(message = "챌린지 ID는 필수입니다.")
    val challengeId: Long,

    @field:NotBlank(message = "파일명은 필수입니다.")
    val filename: String,

    @field:NotBlank(message = "컨텐츠 타입은 필수입니다.")
    val contentType: String,

    @field:NotNull(message = "파일 크기는 필수입니다.")
    val fileSize: Long
)

data class PresignedUrlResponse(
    val presignedUrl: String,
    val imageKey: String,
    val expiresAt: LocalDateTime
)
