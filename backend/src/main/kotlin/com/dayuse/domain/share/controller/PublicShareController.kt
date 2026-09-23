package com.dayuse.domain.share.controller

import com.dayuse.domain.share.dto.PublicShareCardResponse
import com.dayuse.domain.share.service.ShareCardService
import com.dayuse.domain.share.service.ShareOgImageService
import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.util.concurrent.TimeUnit

@RestController
@RequestMapping("/api/v1/public/shares")
class PublicShareController(
    private val shareCardService: ShareCardService,
    private val shareOgImageService: ShareOgImageService
) {

    @GetMapping("/{token}")
    fun getPublicShareCard(
        @PathVariable token: String
    ): ResponseEntity<PublicShareCardResponse> {
        val response = shareCardService.getPublicShareCard(token)
        return ResponseEntity.ok(response)
    }

    /**
     * 링크 미리보기(og:image)가 가리키는 주소.
     *
     * 프리사인 URL은 60분이면 만료돼 외부 크롤러가 쓸 수 없어서, 만료 없는 이 경로를 대신 쓴다.
     * 하루짜리 공개 캐시를 달아 CDN이 받아내게 한다. 카드를 해제해도 최대 하루는
     * 엣지에 남은 썸네일이 보일 수 있는데, 링크 자체는 즉시 404가 되므로 그대로 둔다.
     */
    @GetMapping("/{token}/og.jpg", produces = [MediaType.IMAGE_JPEG_VALUE])
    fun getShareOgImage(
        @PathVariable token: String
    ): ResponseEntity<ByteArray> {
        val image = shareOgImageService.renderOgImage(token)
        return ResponseEntity.ok()
            .contentType(MediaType.IMAGE_JPEG)
            .cacheControl(CacheControl.maxAge(1, TimeUnit.DAYS).cachePublic())
            .body(image)
    }
}
