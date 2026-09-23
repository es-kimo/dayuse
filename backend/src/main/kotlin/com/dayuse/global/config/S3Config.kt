package com.dayuse.global.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
import software.amazon.awssdk.services.s3.S3Client
import software.amazon.awssdk.services.s3.presigner.S3Presigner
import java.net.URI

@Configuration
class S3Config(
    @Value("\${aws.s3.region:ap-northeast-2}") private val region: String,
    @Value("\${aws.s3.access-key:dummy-access-key}") private val accessKey: String,
    @Value("\${aws.s3.secret-key:dummy-secret-key}") private val secretKey: String,
    @Value("\${aws.s3.endpoint:}") private val endpoint: String?
) {

    @Bean
    fun s3Presigner(): S3Presigner {
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)
        val builder = S3Presigner.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))

        if (!endpoint.isNullOrBlank()) {
            builder.endpointOverride(URI.create(endpoint))
        }

        return builder.build()
    }

    /**
     * 서버가 객체 내용을 직접 읽어야 하는 경로(OG 이미지 가공)용 클라이언트.
     *
     * endpoint를 덮어쓰는 로컬 목 S3는 가상 호스트 주소를 만들 수 없으므로 path-style로 붙는다.
     */
    @Bean
    fun s3Client(): S3Client {
        val credentials = AwsBasicCredentials.create(accessKey, secretKey)
        val builder = S3Client.builder()
            .region(Region.of(region))
            .credentialsProvider(StaticCredentialsProvider.create(credentials))

        if (!endpoint.isNullOrBlank()) {
            builder.endpointOverride(URI.create(endpoint))
            builder.forcePathStyle(true)
        }

        return builder.build()
    }
}
