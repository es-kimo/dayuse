package com.dayuse.domain.share.controller

import com.dayuse.domain.share.dto.ShareCardResponse
import com.dayuse.domain.share.service.ShareCardService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/shares")
class ShareController(
    private val shareCardService: ShareCardService
) {

    @PostMapping("/verifications/{verificationId}")
    fun createVerificationShare(
        @CurrentUserId userId: Long,
        @PathVariable verificationId: Long
    ): ResponseEntity<ShareCardResponse> {
        val response = shareCardService.createVerificationShare(userId, verificationId)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @PostMapping("/challenges/{challengeId}/streak")
    fun createStreakShare(
        @CurrentUserId userId: Long,
        @PathVariable challengeId: Long
    ): ResponseEntity<ShareCardResponse> {
        val response = shareCardService.createStreakShare(userId, challengeId)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @DeleteMapping("/{token}")
    fun deactivateShareCard(
        @CurrentUserId userId: Long,
        @PathVariable token: String
    ): ResponseEntity<Void> {
        shareCardService.deactivateShareCard(userId, token)
        return ResponseEntity.noContent().build()
    }
}
