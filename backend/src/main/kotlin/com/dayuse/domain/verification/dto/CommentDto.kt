package com.dayuse.domain.verification.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class CreateCommentRequest(
    @field:NotBlank(message = "댓글 내용은 필수입니다.")
    @field:Size(min = 1, max = 300, message = "댓글은 1자 이상 300자 이하여야 합니다.")
    val content: String
)

data class CommentResponse(
    val id: Long,
    val verificationId: Long,
    val userId: Long,
    val authorNickname: String,
    val authorProfileImageUrl: String?,
    val content: String,
    val isMine: Boolean,
    val createdAt: LocalDateTime
)
