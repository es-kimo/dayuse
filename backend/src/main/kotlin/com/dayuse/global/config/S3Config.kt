package com.dayuse.global.config

import org.springframework.beans.factory.annotation.Value
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider
import software.amazon.awssdk.regions.Region
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
}
