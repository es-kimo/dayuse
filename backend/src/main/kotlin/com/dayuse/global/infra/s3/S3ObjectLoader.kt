package com.dayuse.global.infra.s3

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import software.amazon.awssdk.core.ResponseBytes
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.model.GetObjectRequest
import software.amazon.awssdk.services.s3.model.GetObjectResponse

/**
 * 버킷 객체를 서버에서 직접 읽는다.
 *
 * 프리사인 URL은 60분이면 만료돼서 외부 크롤러가 쓰는 주소로는 쓸 수 없다.
 * OG 이미지처럼 서버가 내용을 가공해 내려줘야 하는 경로에서만 쓴다.
 */
@Component
class S3ObjectLoader(
    private val s3Client: S3Client,
    @Value("\${aws.s3.bucket:dayuse-local-bucket}") private val bucket: String
) {

    companion object {
        private val log = LoggerFactory.getLogger(S3ObjectLoader::class.java)

        /** 인증 사진 업로드 상한과 같은 값. 그보다 큰 객체는 가공 대상이 아니다. */
        private const val MAX_BYTES = 10 * 1024 * 1024L
    }

    /** 실패는 호출부에서 대체 이미지로 흡수하므로 예외 대신 null을 돌려준다. */
    fun load(key: String): ByteArray? {
        return try {
            val request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build()

            val response: ResponseBytes<GetObjectResponse> = s3Client.getObjectAsBytes(request)
            if (response.response().contentLength() > MAX_BYTES) {
                log.warn("S3 객체가 너무 큽니다: key={}, size={}", key, response.response().contentLength())
                return null
            }
            response.asByteArray()
        } catch (e: Exception) {
            log.warn("S3 객체를 읽지 못했습니다: key={}, reason={}", key, e.message)
            null
        }
    }
}
