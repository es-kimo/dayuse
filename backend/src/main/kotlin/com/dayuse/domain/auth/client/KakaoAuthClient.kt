package com.dayuse.domain.auth.client

import com.dayuse.domain.auth.dto.KakaoUserDto
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient

interface KakaoAuthClient {
    fun getUserInfo(code: String, redirectUri: String?): KakaoUserDto
}

@Component
class KakaoAuthClientImpl(
    @param:Value("\${kakao.client-id}") private val clientId: String,
    @param:Value("\${kakao.client-secret:}") private val clientSecret: String,
    @param:Value("\${kakao.redirect-uri}") private val defaultRedirectUri: String
) : KakaoAuthClient {

    private val log = LoggerFactory.getLogger(javaClass)
    private val restClient = RestClient.builder().build()

    override fun getUserInfo(code: String, redirectUri: String?): KakaoUserDto {
        // 로컬 개발/테스트용 Mock 인가 코드 처리
        if (code.startsWith("mock-") || code.startsWith("test-") || clientId.startsWith("dummy-") || clientId.startsWith("test-")) {
            val userNumber = code.filter { it.isDigit() }.ifBlank { "1" }
            log.info("[Mock KakaoAuthClient] Mock 로그인 처리: code={}, userNumber={}", code, userNumber)
            return KakaoUserDto(
                kakaoId = "kakao_mock_$userNumber",
                nickname = "사용자$userNumber",
                profileImageUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=user$userNumber"
            )
        }

        val targetRedirectUri = redirectUri ?: defaultRedirectUri
        val tokenResponse = fetchKakaoAccessToken(code, targetRedirectUri)
        val accessToken = tokenResponse["access_token"] as? String
            ?: throw IllegalStateException("카카오 Access Token 발급에 실패했습니다.")

        return fetchKakaoUserProfile(accessToken)
    }

    @Suppress("UNCHECKED_CAST")
    private fun fetchKakaoAccessToken(code: String, redirectUri: String): Map<String, Any> {
        val formData = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "authorization_code")
            add("client_id", clientId)
            if (clientSecret.isNotBlank()) {
                add("client_secret", clientSecret)
            }
            add("redirect_uri", redirectUri)
            add("code", code)
        }

        return restClient.post()
            .uri("https://kauth.kakao.com/oauth/token")
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(formData)
            .retrieve()
            .body(Map::class.java) as? Map<String, Any>
            ?: throw IllegalStateException("카카오 토큰 응답을 파싱할 수 없습니다.")
    }

    @Suppress("UNCHECKED_CAST")
    private fun fetchKakaoUserProfile(accessToken: String): KakaoUserDto {
        val userResponse = restClient.get()
            .uri("https://kapi.kakao.com/v2/user/me")
            .header("Authorization", "Bearer $accessToken")
            .retrieve()
            .body(Map::class.java) as? Map<String, Any>
            ?: throw IllegalStateException("카카오 사용자 정보를 가져올 수 없습니다.")

        val kakaoId = userResponse["id"]?.toString()
            ?: throw IllegalStateException("카카오 회원 번호를 찾을 수 없습니다.")

        val properties = userResponse["properties"] as? Map<String, Any>
        val kakaoAccount = userResponse["kakao_account"] as? Map<String, Any>
        val profile = kakaoAccount?.get("profile") as? Map<String, Any>

        val nickname = (properties?.get("nickname") ?: profile?.get("nickname") ?: "모임원_${kakaoId.takeLast(4)}") as String
        val profileImageUrl = (properties?.get("profile_image") ?: profile?.get("profile_image_url")) as? String

        return KakaoUserDto(
            kakaoId = kakaoId,
            nickname = nickname,
            profileImageUrl = profileImageUrl
        )
    }
}
