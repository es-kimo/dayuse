@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.user

import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class UserIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var testUser: User
    private lateinit var authToken: String

    @BeforeEach
    fun setUp() {
        testUser = userRepository.save(
            User(
                kakaoId = "kakao-test-12345",
                nickname = "초기닉네임",
                profileImageUrl = null
            )
        )
        authToken = jwtTokenProvider.generateAccessToken(testUser.id)
    }

    @Test
    @DisplayName("GET /api/v1/users/me - 내 프로필을 정상 조회한다")
    fun getMeSuccess() {
        mockMvc.get("/api/v1/users/me") {
            header("Authorization", "Bearer $authToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(testUser.id) }
            jsonPath("$.nickname") { value("초기닉네임") }
            jsonPath("$.kakaoId") { value("kakao-test-12345") }
        }
    }

    @Test
    @DisplayName("PATCH /api/v1/users/me - 닉네임을 정상 수정한다")
    fun updateNicknameSuccess() {
        val request = mapOf("nickname" to "새로운닉네임")

        mockMvc.patch("/api/v1/users/me") {
            header("Authorization", "Bearer $authToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.nickname") { value("새로운닉네임") }
        }
    }

    @Test
    @DisplayName("PATCH /api/v1/users/me - 데이유 아바타(profileImageUrl)를 정상 수정한다")
    fun updateDayuAvatarSuccess() {
        val request = mapOf("profileImageUrl" to "dayu:mint")

        mockMvc.patch("/api/v1/users/me") {
            header("Authorization", "Bearer $authToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.nickname") { value("초기닉네임") }
            jsonPath("$.profileImageUrl") { value("dayu:mint") }
        }
    }

    @Test
    @DisplayName("PATCH /api/v1/users/me - 닉네임과 데이유 아바타를 동시에 정상 수정한다")
    fun updateNicknameAndAvatarSuccess() {
        val request = mapOf(
            "nickname" to "류코딩",
            "profileImageUrl" to "dayu:purple"
        )

        mockMvc.patch("/api/v1/users/me") {
            header("Authorization", "Bearer $authToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.nickname") { value("류코딩") }
            jsonPath("$.profileImageUrl") { value("dayu:purple") }
        }
    }

    @Test
    @DisplayName("PATCH /api/v1/users/me - 닉네임 2자 미만 시 400 에러를 반환한다")
    fun updateNicknameTooShortError() {
        val request = mapOf("nickname" to "A")

        mockMvc.patch("/api/v1/users/me") {
            header("Authorization", "Bearer $authToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
        }
    }
}
