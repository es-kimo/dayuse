package com.dayuse.domain.verification.controller

import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.dto.PresignedUrlRequest
import com.dayuse.domain.verification.dto.PresignedUrlResponse
import com.dayuse.domain.verification.dto.UpdateVerificationRequest
import com.dayuse.domain.verification.dto.VerificationDetailResponse
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/verifications")
class VerificationController(
    private val verificationService: VerificationService,
    private val presignedUrlService: PresignedUrlService
) {

    @PostMapping("/presigned-url")
    fun getPresignedUrl(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: PresignedUrlRequest
    ): ResponseEntity<PresignedUrlResponse> {
        val response = presignedUrlService.generatePresignedUrl(userId, request)
        return ResponseEntity.ok(response)
    }

    @PostMapping
    fun createVerification(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CreateVerificationRequest
    ): ResponseEntity<VerificationDetailResponse> {
        val response = verificationService.createVerification(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PatchMapping("/{verificationId}")
    fun updateVerification(
        @PathVariable verificationId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UpdateVerificationRequest
    ): ResponseEntity<VerificationDetailResponse> {
        val response = verificationService.updateVerification(verificationId, userId, request)
        return ResponseEntity.ok(response)
    }

    @DeleteMapping("/{verificationId}")
    fun deleteVerification(
        @PathVariable verificationId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<Void> {
        verificationService.deleteVerification(verificationId, userId)
        return ResponseEntity.noContent().build()
    }
}
