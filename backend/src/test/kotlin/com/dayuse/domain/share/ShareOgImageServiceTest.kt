@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.share

import com.dayuse.domain.share.service.ShareOgImageService
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.infra.s3.S3ObjectLoader
import org.junit.jupiter.api.Assertions.assertArrayEquals
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import java.awt.image.BufferedImage
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import javax.imageio.ImageIO

class ShareOgImageServiceTest {

    private val shareCardRepository = mock(ShareCardRepository::class.java)
    private val presignedUrlService = mock(PresignedUrlService::class.java)
    private val s3ObjectLoader = mock(S3ObjectLoader::class.java)
    private val service = ShareOgImageService(shareCardRepository, presignedUrlService, s3ObjectLoader)

    private val defaultImage: ByteArray =
        javaClass.classLoader.getResourceAsStream("og/share-default.jpg")!!.use { it.readBytes() }

    private fun card(
        imageUrl: String? = null,
        isActive: Boolean = true
    ) = ShareCard(
        token = "tok",
        cardType = ShareCardType.STREAK,
        userId = 1L,
        challengeId = 2L,
        title = "매일 아침 6시 기상",
        userNickname = "공유러너",
        imageUrl = imageUrl,
        isActive = isActive
    )

    private fun jpegOf(width: Int, height: Int): ByteArray {
        val image = BufferedImage(width, height, BufferedImage.TYPE_INT_RGB)
        return ByteArrayOutputStream().use { out ->
            ImageIO.write(image, "jpg", out)
            out.toByteArray()
        }
    }

    private fun sizeOf(bytes: ByteArray): Pair<Int, Int> {
        val image = ImageIO.read(ByteArrayInputStream(bytes))
        return image.width to image.height
    }

    @Test
    fun `없는 토큰은 404로 막는다`() {
        `when`(shareCardRepository.findByToken("nope")).thenReturn(null)

        assertThrows(ResourceNotFoundException::class.java) {
            service.renderOgImage("nope")
        }
    }

    @Test
    fun `해제된 카드는 원본이 있어도 404로 막는다`() {
        `when`(shareCardRepository.findByToken("tok")).thenReturn(card(imageUrl = "verifications/2/1/a.jpg", isActive = false))

        assertThrows(ResourceNotFoundException::class.java) {
            service.renderOgImage("tok")
        }
        // 차단된 카드는 버킷을 건드리지도 않아야 한다.
        verify(s3ObjectLoader, never()).load(anyString())
    }

    @Test
    fun `사진이 없는 연속 기록 카드는 기본 이미지를 내려준다`() {
        `when`(shareCardRepository.findByToken("tok")).thenReturn(card(imageUrl = null))
        `when`(presignedUrlService.resolveOwnedBucketKey(null, 2L, 1L)).thenReturn(null)

        assertArrayEquals(defaultImage, service.renderOgImage("tok"))
        verify(s3ObjectLoader, never()).load(anyString())
    }

    @Test
    fun `원본을 읽지 못하면 기본 이미지로 흡수한다`() {
        `when`(shareCardRepository.findByToken("tok")).thenReturn(card(imageUrl = "verifications/2/1/a.jpg"))
        `when`(presignedUrlService.resolveOwnedBucketKey("verifications/2/1/a.jpg", 2L, 1L))
            .thenReturn("verifications/2/1/a.jpg")
        `when`(s3ObjectLoader.load("verifications/2/1/a.jpg")).thenReturn(null)

        assertArrayEquals(defaultImage, service.renderOgImage("tok"))
    }

    @Test
    fun `인증 사진은 1200x630으로 잘라 내려준다`() {
        `when`(shareCardRepository.findByToken("tok")).thenReturn(card(imageUrl = "verifications/2/1/a.jpg"))
        `when`(presignedUrlService.resolveOwnedBucketKey("verifications/2/1/a.jpg", 2L, 1L))
            .thenReturn("verifications/2/1/a.jpg")
        `when`(s3ObjectLoader.load("verifications/2/1/a.jpg")).thenReturn(jpegOf(1000, 1000))

        val rendered = service.renderOgImage("tok")

        assertFalse(rendered.contentEquals(defaultImage))
        assertEquals(ShareOgImageService.OG_WIDTH to ShareOgImageService.OG_HEIGHT, sizeOf(rendered))
    }

    @Test
    fun `가로로 긴 원본도 세로로 긴 원본도 같은 규격으로 맞춘다`() {
        listOf(2400 to 800, 600 to 1800, 1200 to 630, 100 to 100).forEach { (width, height) ->
            val rendered = service.cropToOgSize(jpegOf(width, height))
            assertNotNull(rendered, "$width x $height 변환 실패")
            assertEquals(
                ShareOgImageService.OG_WIDTH to ShareOgImageService.OG_HEIGHT,
                sizeOf(rendered!!),
                "$width x $height 결과 규격 불일치"
            )
        }
    }

    @Test
    fun `이미지가 아닌 바이트는 null을 돌려준다`() {
        assertNull(service.cropToOgSize("이건 이미지가 아니다".toByteArray()))
    }

    @Test
    fun `세로로 긴 원본 이미지는 잘리지 않고 중앙에 배치되며 좌우에 레터박스 여백이 생성된다`() {
        // 흰색(0xFFFFFF) 단색 이미지 생성 (세로 600x1200)
        val whiteImage = BufferedImage(600, 1200, BufferedImage.TYPE_INT_RGB).apply {
            val g = createGraphics()
            g.color = java.awt.Color.WHITE
            g.fillRect(0, 0, 600, 1200)
            g.dispose()
        }
        val bytes = ByteArrayOutputStream().use { out ->
            ImageIO.write(whiteImage, "jpg", out)
            out.toByteArray()
        }

        val rendered = service.cropToOgSize(bytes)
        assertNotNull(rendered)

        val resultImage = ImageIO.read(ByteArrayInputStream(rendered))
        assertEquals(ShareOgImageService.OG_WIDTH, resultImage.width)
        assertEquals(ShareOgImageService.OG_HEIGHT, resultImage.height)

        // 좌측 끝 여백 (x=10, y=315): 배경색(0x0F172A)이어야 함
        val leftPixel = resultImage.getRGB(10, 315) and 0x00FFFFFF
        assertEquals(0x0F172A, leftPixel, "좌측 여백에 배경색이 칠해져야 합니다")

        // 중앙 지점 (x=600, y=315): 원본 이미지의 흰색이어야 함
        val centerPixel = resultImage.getRGB(600, 315) and 0x00FFFFFF
        // JPEG 압축 특성상 오차 허용 (흰색에 매우 가까워야 함)
        val r = (centerPixel shr 16) and 0xFF
        val g = (centerPixel shr 8) and 0xFF
        val b = centerPixel and 0xFF
        org.junit.jupiter.api.Assertions.assertTrue(r > 240 && g > 240 && b > 240, "중앙 영역에 원본 이미지가 위치해야 합니다")
    }
}
