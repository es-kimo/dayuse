@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.verification

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.dto.PresignedUrlRequest
import com.dayuse.domain.verification.dto.UpdateVerificationRequest
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class VerificationIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var participantUser: User
    private lateinit var otherMemberUser: User
    private lateinit var strangerUser: User

    private lateinit var participantToken: String
    private lateinit var otherMemberToken: String
    private lateinit var strangerToken: String

    private lateinit var group: Group
    private lateinit var challenge: Challenge

    @BeforeEach
    fun setUp() {
        participantUser = userRepository.save(
            User(
                kakaoId = "part_1",
                nickname = "참여자"
            )
        )
        otherMemberUser = userRepository.save(
            User(
                kakaoId = "other_1",
                nickname = "다른멤버"
            )
        )
        strangerUser = userRepository.save(
            User(
                kakaoId = "stranger_1",
                nickname = "외부인"
            )
        )

        participantToken = jwtTokenProvider.generateAccessToken(participantUser.id)
        otherMemberToken = jwtTokenProvider.generateAccessToken(otherMemberUser.id)
        strangerToken = jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(
            Group(
                name = "테스트 모임",
                hostUserId = participantUser.id,
                inviteCode = "INVITE-VERIFY"
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = participantUser.id,
                role = GroupRole.HOST
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = otherMemberUser.id,
                role = GroupRole.MEMBER
            )
        )

        val today = DateTimeUtils.todayKst()
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = participantUser.id,
                title = "매일 아침 독서",
                description = "책 10페이지 읽기",
                verificationCriteria = "책 사진",
                startDate = today.minusDays(2),
                endDate = today.plusDays(10)
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = participantUser.id,
                penaltyAmount = 5000
            )
        )
    }

    @Test
    fun `DoD 1 챌린지 참여자가 10MB 이하 JPG 사진으로 Presigned URL을 요청하면 성공적으로 URL과 imageKey를 발급받는다`() {
        val request = PresignedUrlRequest(
            challengeId = challenge.id,
            filename = "book.jpg",
            contentType = "image/jpeg",
            fileSize = 2 * 1024 * 1024 // 2MB
        )

        mockMvc.post("/api/v1/verifications/presigned-url") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.presignedUrl") { isNotEmpty() }
            jsonPath("$.imageKey") { isNotEmpty() }
            jsonPath("$.expiresAt") { isNotEmpty() }
        }
    }

    @Test
    fun `10MB 초과 파일이나 지원하지 않는 확장자로 Presigned URL 요청 시 400 Bad Request가 발생한다`() {
        // 1. 10MB 초과 (11MB)
        val overSizeRequest = PresignedUrlRequest(
            challengeId = challenge.id,
            filename = "large.jpg",
            contentType = "image/jpeg",
            fileSize = 11 * 1024 * 1024
        )

        mockMvc.post("/api/v1/verifications/presigned-url") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(overSizeRequest)
        }.andExpect {
            status { isBadRequest() }
        }

        // 2. 지원하지 않는 파일 형식 (pdf)
        val invalidFormatRequest = PresignedUrlRequest(
            challengeId = challenge.id,
            filename = "document.pdf",
            contentType = "application/pdf",
            fileSize = 1024
        )

        mockMvc.post("/api/v1/verifications/presigned-url") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(invalidFormatRequest)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `챌린지 비참여자가 Presigned URL을 요청하면 403 Forbidden이 발생한다`() {
        val request = PresignedUrlRequest(
            challengeId = challenge.id,
            filename = "book.png",
            contentType = "image/png",
            fileSize = 1024
        )

        mockMvc.post("/api/v1/verifications/presigned-url") {
            header(
                "Authorization",
                "Bearer $otherMemberToken"
            ) // 모임원이지만 챌린지 미참여자
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 1 참여자가 사진 인증을 등록하면 201 Created로 정상 생성되고 당일 인증은 isLate가 false이다`() {
        val request = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://s3.example.com/reading.jpg",
            comment = "10페이지 완료!"
        )

        mockMvc.post("/api/v1/verifications") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { isNumber() }
            jsonPath("$.challengeId") { value(challenge.id) }
            jsonPath("$.imageUrl") { value("https://s3.example.com/reading.jpg") }
            jsonPath("$.comment") { value("10페이지 완료!") }
            jsonPath("$.isLate") { value(false) }
        }
    }

    @Test
    fun `과거 대상 날짜(targetDate 미도래 또는 이전 날짜)로 인증을 등록하면 isLate가 true로 세팅된다`() {
        val yesterday = DateTimeUtils.todayKst().minusDays(1)
        val request = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://s3.example.com/yesterday.jpg",
            comment = "어제 깜빡해서 지금 올립니다",
            targetDate = yesterday
        )

        mockMvc.post("/api/v1/verifications") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.targetDate") { value(yesterday.toString()) }
            jsonPath("$.isLate") { value(true) }
        }
    }

    @Test
    fun `DoD 2 동일 챌린지, 동일 참여자, 동일 날짜에 2회 이상 인증 시도 시 409 Conflict로 방어된다`() {
        val today = DateTimeUtils.todayKst()
        val request = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://s3.example.com/first.jpg",
            comment = "1차 인증",
            targetDate = today
        )

        mockMvc.post("/api/v1/verifications") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }

        val duplicateRequest = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://s3.example.com/second.jpg",
            comment = "2차 중복 시도",
            targetDate = today
        )

        mockMvc.post("/api/v1/verifications") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(duplicateRequest)
        }.andExpect {
            status { isConflict() }
            jsonPath("$.error") { value("CONFLICT") }
            jsonPath("$.message") { value("해당 챌린지는 대상 날짜에 이미 인증을 완료했습니다.") }
        }
    }

    @Test
    fun `본인이 작성한 오늘 인증은 사진과 한마디를 수정할 수 있다`() {
        val today = DateTimeUtils.todayKst()
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = participantUser.id,
                targetDate = today,
                imageUrl = "https://s3.example.com/old.jpg",
                comment = "수정 전 문구"
            )
        )

        val updateRequest = UpdateVerificationRequest(
            imageUrl = "https://s3.example.com/new.jpg",
            comment = "수정된 문구"
        )

        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.imageUrl") { value("https://s3.example.com/new.jpg") }
            jsonPath("$.comment") { value("수정된 문구") }
        }
    }

    @Test
    fun `타인의 인증을 수정하거나 삭제하려고 하면 403 Forbidden이 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = participantUser.id,
                targetDate = today,
                imageUrl = "https://s3.example.com/my.jpg",
                comment = "내 인증"
            )
        )

        val updateRequest = UpdateVerificationRequest(comment = "남이 수정 시도")

        // 타인 수정 시도
        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $otherMemberToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isForbidden() }
        }

        // 타인 삭제 시도
        mockMvc.delete("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $otherMemberToken"
            )
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `본인이 작성한 오늘 인증을 삭제하면 204 No Content로 삭제된다`() {
        val today = DateTimeUtils.todayKst()
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = participantUser.id,
                targetDate = today,
                imageUrl = "https://s3.example.com/delete-target.jpg"
            )
        )

        mockMvc.delete("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
        }.andExpect {
            status { isNoContent() }
        }

        assertFalse(verificationRepository.existsById(verification.id))
    }

    @Test
    fun `과거 날짜의 인증은 수정하거나 삭제할 수 없다`() {
        val pastDate = DateTimeUtils.todayKst().minusDays(1)
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = participantUser.id,
                targetDate = pastDate,
                imageUrl = "https://s3.example.com/past.jpg",
                comment = "어제 인증",
                isLate = true
            )
        )

        // 과거 인증 수정 시도 -> 400 Bad Request
        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdateVerificationRequest(comment = "과거 인증 수정"))
        }.andExpect {
            status { isBadRequest() }
        }

        // 과거 인증 삭제 시도 -> 400 Bad Request
        mockMvc.delete("/api/v1/verifications/${verification.id}") {
            header(
                "Authorization",
                "Bearer $participantToken"
            )
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `1001자 이미지 URL로 인증을 생성하면 400과 길이 오류를 반환한다`() {
        val beforeCount = verificationRepository.count()
        val request = CreateVerificationRequest(challengeId = challenge.id, imageUrl = imageUrlOfLength(1001))

        mockMvc.post("/api/v1/verifications") {
            header("Authorization", "Bearer $participantToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("이미지 URL은 1000자 이하여야 합니다.") }
        }
        assertEquals(beforeCount, verificationRepository.count())
    }

    @Test
    fun `1000자 이미지 URL로 인증을 생성할 수 있다`() {
        val imageUrl = imageUrlOfLength(1000) // DB 컬럼과 요청 검증의 최대 허용 길이
        mockMvc.post("/api/v1/verifications") {
            header("Authorization", "Bearer $participantToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(CreateVerificationRequest(challenge.id, imageUrl))
        }.andExpect {
            status { isCreated() }
            jsonPath("$.imageUrl") { value(imageUrl) }
        }
        assertEquals(imageUrl, verificationRepository.findAll().single().imageUrl)
    }

    @Test
    fun `1001자 이미지 URL로 인증을 수정하면 400이고 기존 값이 유지된다`() {
        val verification = saveVerificationForUrlValidation()
        val originalUrl = verification.imageUrl
        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header("Authorization", "Bearer $participantToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdateVerificationRequest(imageUrlOfLength(1001)))
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("이미지 URL은 1000자 이하여야 합니다.") }
        }
        assertEquals(originalUrl, verificationRepository.findById(verification.id).orElseThrow().imageUrl)
    }

    @Test
    fun `1000자 이미지 URL로 인증을 수정할 수 있다`() {
        val verification = saveVerificationForUrlValidation()
        val imageUrl = imageUrlOfLength(1000)
        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header("Authorization", "Bearer $participantToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdateVerificationRequest(imageUrl))
        }.andExpect {
            status { isOk() }
            jsonPath("$.imageUrl") { value(imageUrl) }
        }
        assertEquals(imageUrl, verificationRepository.findById(verification.id).orElseThrow().imageUrl)
    }

    @Test
    fun `이미지 URL을 생략하고 한마디만 수정하면 기존 이미지가 유지된다`() {
        val verification = saveVerificationForUrlValidation()
        val originalUrl = verification.imageUrl
        mockMvc.patch("/api/v1/verifications/${verification.id}") {
            header("Authorization", "Bearer $participantToken")
            contentType = MediaType.APPLICATION_JSON
            content = """{"comment":"한마디만 수정"}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.imageUrl") { value(originalUrl) }
            jsonPath("$.comment") { value("한마디만 수정") }
        }
    }

    private fun imageUrlOfLength(length: Int): String {
        val prefix = "https://s3.example.com/"
        return prefix + "a".repeat(length - prefix.length)
    }

    private fun saveVerificationForUrlValidation(): Verification = verificationRepository.save(
        Verification(
            groupId = group.id,
            challengeId = challenge.id,
            userId = participantUser.id,
            targetDate = DateTimeUtils.todayKst(),
            imageUrl = "https://s3.example.com/original.jpg"
        )
    )

}
