package com.dayuse.domain.share.service

import com.dayuse.domain.share.ShareCardRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.infra.s3.S3ObjectLoader
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.awt.Color
import java.awt.RenderingHints
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO
import kotlin.math.ceil
import kotlin.math.max

/**
 * 공유 링크의 OG 썸네일을 요청 시점에 만들어 내려준다.
 *
 * 카드 이미지를 따로 저장하지 않는 게 요점이다. 인증 사진은 이미 버킷에 있으니
 * 그것을 1200x630으로 잘라 내려주고, 사진이 없는 연속 기록 카드는 기본 이미지로 대체한다.
 * 응답에 긴 캐시 헤더를 달아 CDN이 받아내므로 카드당 원본 조회는 사실상 1회다.
 */
@Service
class ShareOgImageService(
    private val shareCardRepository: ShareCardRepository,
    private val presignedUrlService: PresignedUrlService,
    private val s3ObjectLoader: S3ObjectLoader
) {

    companion object {
        const val OG_WIDTH = 1200
        const val OG_HEIGHT = 630
        const val CONTENT_TYPE = "image/jpeg"

        private const val DEFAULT_IMAGE_RESOURCE = "og/share-default.jpg"
        private val BACKGROUND = Color(0x0F172A)
        private val log = LoggerFactory.getLogger(ShareOgImageService::class.java)
    }

    /** 클래스패스 리소스라 한 번만 읽어 재사용한다. */
    private val defaultImage: ByteArray by lazy {
        javaClass.classLoader.getResourceAsStream(DEFAULT_IMAGE_RESOURCE)?.use { it.readBytes() }
            ?: throw IllegalStateException("기본 OG 이미지를 찾을 수 없습니다: $DEFAULT_IMAGE_RESOURCE")
    }

    /**
     * 비활성화되었거나 없는 토큰은 404로 막는다.
     * 원본을 못 읽거나 이미지가 깨진 경우는 기본 이미지로 흡수한다 —
     * 프리뷰가 깨진 것보다 브랜드 이미지라도 뜨는 편이 낫다.
     */
    @Transactional(readOnly = true)
    fun renderOgImage(token: String): ByteArray {
        val card = shareCardRepository.findByToken(token)
            ?: throw ResourceNotFoundException("공유 카드를 찾을 수 없거나 비활성화되었습니다.")

        if (!card.isActive) {
            throw ResourceNotFoundException("공유 카드를 찾을 수 없거나 비활성화되었습니다.")
        }

        val key = presignedUrlService.resolveOwnedBucketKey(card.imageUrl, card.challengeId, card.userId)
            ?: return defaultImage

        val source = s3ObjectLoader.load(key) ?: return defaultImage

        return cropToOgSize(source) ?: run {
            log.warn("OG 이미지 변환에 실패했습니다: token={}, key={}", token, key)
            defaultImage
        }
    }

    /**
     * 비율을 유지한 채 1200x630을 꽉 채우도록 확대/축소하고 가운데를 남긴다.
     * 디코딩에 실패하면 null을 돌려 호출부가 기본 이미지로 넘어가게 한다.
     */
    internal fun cropToOgSize(source: ByteArray): ByteArray? {
        val original = try {
            ImageIO.read(ByteArrayInputStream(source))
        } catch (e: Exception) {
            log.warn("이미지를 디코딩하지 못했습니다: {}", e.message)
            null
        } ?: return null

        if (original.width <= 0 || original.height <= 0) return null

        val scale = max(
            OG_WIDTH.toDouble() / original.width,
            OG_HEIGHT.toDouble() / original.height
        )
        val scaledWidth = ceil(original.width * scale).toInt()
        val scaledHeight = ceil(original.height * scale).toInt()

        // 투명 PNG가 검게 깔리지 않도록 카드 배경색을 먼저 칠한다.
        val target = BufferedImage(OG_WIDTH, OG_HEIGHT, BufferedImage.TYPE_INT_RGB)
        val graphics = target.createGraphics()
        try {
            graphics.setRenderingHint(
                RenderingHints.KEY_INTERPOLATION,
                RenderingHints.VALUE_INTERPOLATION_BILINEAR
            )
            graphics.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY)
            graphics.color = BACKGROUND
            graphics.fillRect(0, 0, OG_WIDTH, OG_HEIGHT)
            graphics.drawImage(
                original,
                (OG_WIDTH - scaledWidth) / 2,
                (OG_HEIGHT - scaledHeight) / 2,
                scaledWidth,
                scaledHeight,
                null
            )
        } finally {
            graphics.dispose()
        }

        return ByteArrayOutputStream().use { out ->
            if (!ImageIO.write(target, "jpg", out)) return null
            out.toByteArray()
        }
    }
}
