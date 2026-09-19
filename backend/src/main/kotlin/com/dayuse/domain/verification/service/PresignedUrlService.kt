package com.dayuse.domain.verification.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.verification.dto.PresignedUrlRequest
import com.dayuse.domain.verification.dto.PresignedUrlResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import software.amazon.awssdk.services.s3.model.PutObjectRequest
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest
import java.time.Duration
import java.time.LocalDateTime
import java.util.UUID

@Service
class PresignedUrlService(
    private val s3Presigner: S3Presigner,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    @Value("\${aws.s3.bucket:dayuse-local-bucket}") private val bucket: String
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
}
