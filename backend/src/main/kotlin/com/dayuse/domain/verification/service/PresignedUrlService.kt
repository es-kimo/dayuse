package com.dayuse.domain.verification.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.verification.dto.PresignedUrlRequest
import com.dayuse.domain.verification.dto.PresignedUrlResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import java.net.URI
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID

@Service
class PresignedUrlService(
    private val s3Presigner: S3Presigner,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    @Value("\${aws.s3.bucket:dayuse-local-bucket}") private val bucket: String,
    @Value("\${aws.s3.region:ap-northeast-2}") private val region: String = "ap-northeast-2"
) {

    companion object {
        private const val MAX_FILE_SIZE = 10 * 1024 * 1024L // 10MB
        private val ALLOWED_CONTENT_TYPES = setOf("image/jpeg", "image/png", "image/webp")
        private val ALLOWED_EXTENSIONS = setOf("jpg", "jpeg", "png", "webp")
    }

    fun generatePresignedUrl(userId: Long, request: PresignedUrlRequest): PresignedUrlResponse {
        val isParticipant = challengeParticipantRepository.existsByChallengeIdAndUserId(request.challengeId, userId)
        if (!isParticipant) {
            throw ForbiddenException("해당 챌린지의 참여자만 인증 사진을 업로드할 수 있습니다.")
        }

        if (request.fileSize <= 0 || request.fileSize > MAX_FILE_SIZE) {
            throw BadRequestException("파일 크기는 10MB 이하여야 합니다.")
        }

        val ext = request.filename.substringAfterLast('.', "").lowercase()
        val isContentTypeAllowed = ALLOWED_CONTENT_TYPES.contains(request.contentType.lowercase())
        val isExtensionAllowed = ALLOWED_EXTENSIONS.contains(ext)

        if (!isContentTypeAllowed && !isExtensionAllowed) {
            throw BadRequestException("지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP만 지원)")
        }

        val fileExtension = if (isExtensionAllowed) ext else when (request.contentType.lowercase()) {
            "image/jpeg" -> "jpg"
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "jpg"
        }

        val uniqueKey = "verifications/${request.challengeId}/$userId/${UUID.randomUUID()}.$fileExtension"

        val putObjectRequest = PutObjectRequest.builder()
            .bucket(bucket)
            .key(uniqueKey)
            .contentType(request.contentType)
            .build()

        val presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(10))
            .putObjectRequest(putObjectRequest)
            .build()

        val presignedPutObjectRequest = s3Presigner.presignPutObject(presignRequest)
        val presignedUrl = presignedPutObjectRequest.url().toString()
        val expiresAt = LocalDateTime.now().plusMinutes(10)

        return PresignedUrlResponse(
            presignedUrl = presignedUrl,
            imageKey = uniqueKey,
            expiresAt = expiresAt
        )
    }

    /** 외부 URL은 서명하지 않고, 우리 버킷의 키만 소유 범위를 검증한다. */
    fun validateImageOwnership(imagePathOrUrl: String?, challengeId: Long, ownerUserId: Long) {
        val key = extractOwnedBucketKey(imagePathOrUrl) ?: return
        val expectedPrefix = "verifications/$challengeId/$ownerUserId/"
        // 경로 정규화/인코딩으로 소유 범위를 우회하지 못하도록 업로드 키 형식만 허용한다.
        val validKey = Regex("verifications/[0-9]+/[0-9]+/[A-Za-z0-9_-]+\\.(jpg|jpeg|png|webp)")
        if (!key.startsWith(expectedPrefix) || !validKey.matches(key)) {
            throw ForbiddenException("해당 인증에 사용할 수 없는 이미지입니다.")
        }
    }

    fun generatePresignedGetUrl(imagePathOrUrl: String?, challengeId: Long, ownerUserId: Long): String {
        val key = extractOwnedBucketKey(imagePathOrUrl) ?: return imagePathOrUrl.orEmpty()
        // 과거에 잘못 저장된 키도 읽기 경로에서 서명하지 않는다.
        validateImageOwnership(imagePathOrUrl, challengeId, ownerUserId)
        val getObjectRequest = GetObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build()
        val presignRequest = GetObjectPresignRequest.builder()
            .signatureDuration(Duration.ofMinutes(60))
            .getObjectRequest(getObjectRequest)
            .build()
        return s3Presigner.presignGetObject(presignRequest).url().toString()
    }

    private fun extractOwnedBucketKey(imagePathOrUrl: String?): String? {
        if (imagePathOrUrl.isNullOrBlank()) return null
        if (imagePathOrUrl.startsWith("verifications/")) return imagePathOrUrl

        val uri = try {
            URI(imagePathOrUrl)
        } catch (_: java.net.URISyntaxException) {
            return null
        }
        // 이전 프론트가 저장한 자체 버킷의 URL만 키로 변환한다.
        val allowedHosts = setOf("$bucket.s3.$region.amazonaws.com", "$bucket.s3.amazonaws.com")
        if (uri.scheme != "https" || uri.host !in allowedHosts || uri.userInfo != null || uri.port != -1) {
            return null
        }
        return uri.rawPath.removePrefix("/")
    }
}
