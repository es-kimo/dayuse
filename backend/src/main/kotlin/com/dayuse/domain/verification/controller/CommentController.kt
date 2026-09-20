package com.dayuse.domain.verification.controller

import com.dayuse.domain.verification.dto.CommentResponse
import com.dayuse.domain.verification.dto.CreateCommentRequest
import com.dayuse.domain.verification.service.CommentService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class CommentController(
    private val commentService: CommentService
) {

    @GetMapping("/api/v1/verifications/{verificationId}/comments")
    fun getComments(
        @PathVariable verificationId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<List<CommentResponse>> {
        val response = commentService.getComments(verificationId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/verifications/{verificationId}/comments")
    fun createComment(
        @PathVariable verificationId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CreateCommentRequest
    ): ResponseEntity<CommentResponse> {
        val response = commentService.createComment(verificationId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @DeleteMapping("/api/v1/comments/{commentId}")
    fun deleteComment(
        @PathVariable commentId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<Void> {
        commentService.deleteComment(commentId, userId)
        return ResponseEntity.noContent().build()
    }
}
