@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.verification

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.mock
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import java.net.URI

class PresignedUrlServiceTest {
    private val presigner = S3Presigner.builder()
        .region(Region.AP_NORTHEAST_2)
        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create("test-key", "test-secret")))
        .build()
    private val service = PresignedUrlService(presigner, mock(ChallengeParticipantRepository::class.java), "test-bucket")

    @AfterEach
    fun close() = presigner.close()

    @ParameterizedTest
    @ValueSource(strings = [
        "verifications/10/20/photo.png",
        "https://test-bucket.s3.ap-northeast-2.amazonaws.com/verifications/10/20/photo.png",
        "https://test-bucket.s3.amazonaws.com/verifications/10/20/photo.png?old=query"
    ])
    fun `소유 범위에 속한 키와 기존 버킷 URL에 조회 서명을 발급한다`(input: String) {
        val url = URI(service.generatePresignedGetUrl(input, 10L, 20L))
        assertEquals("/verifications/10/20/photo.png", url.path)
        assertTrue(url.query.contains("X-Amz-Signature="))
        assertTrue(url.query.contains("X-Amz-Expires=3600"))
        assertFalse(url.query.contains("old=query"))
    }

    @ParameterizedTest
    @ValueSource(strings = [
        "verifications/10/21/photo.png",
        "verifications/11/20/photo.png",
        "verifications/10/20/../21/photo.png",
        "verifications/10/20/%2e%2e%2f21%2fphoto.png",
        "https://test-bucket.s3.ap-northeast-2.amazonaws.com/verifications/10/21/photo.png",
        "https://test-bucket.s3.amazonaws.com/verifications/10/20/%2e%2e/21/photo.png"
    ])
    fun `다른 소유 범위와 우회 경로는 저장 검증 및 조회 서명 모두 거절한다`(input: String) {
        assertThrows(ForbiddenException::class.java) { service.validateImageOwnership(input, 10L, 20L) }
        assertThrows(ForbiddenException::class.java) { service.generatePresignedGetUrl(input, 10L, 20L) }
    }

    @ParameterizedTest
    @ValueSource(strings = [
        "https://external.example/verifications/10/20/photo.png",
        "https://test-bucket.s3.ap-northeast-2.amazonaws.com.evil.example/verifications/10/20/photo.png",
        "https://other-bucket.s3.ap-northeast-2.amazonaws.com/verifications/10/20/photo.png",
        "http://localhost:8080/api/v1/mock-s3/photo.png",
        "/api/v1/mock-s3/photo.png"
    ])
    fun `외부 URL과 로컬 mock 주소는 자체 버킷의 서명으로 변환하지 않는다`(input: String) {
        assertEquals(input, service.generatePresignedGetUrl(input, 10L, 20L))
    }
}
