package com.dayuse.domain.share.controller

import com.dayuse.domain.share.dto.PublicShareCardResponse
import com.dayuse.domain.share.service.ShareCardService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/public/shares")
class PublicShareController(
    private val shareCardService: ShareCardService
) {

    @GetMapping("/{token}")
    fun getPublicShareCard(
        @PathVariable token: String
    ): ResponseEntity<PublicShareCardResponse> {
        val response = shareCardService.getPublicShareCard(token)
        return ResponseEntity.ok(response)
    }
}
