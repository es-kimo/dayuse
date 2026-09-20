@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.feed

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
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationComment
import com.dayuse.domain.verification.VerificationCommentRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateCommentRequest
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FeedAndCommentIntegrationTest {

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
    private lateinit var verificationCommentRepository: VerificationCommentRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var member1: User
    private lateinit var member2: User
    private lateinit var stranger: User

    private lateinit var token1: String
    private lateinit var token2: String
    private lateinit var strangerToken: String

    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var verification: Verification

    @BeforeEach
    fun setUp() {
        member1 = userRepository.save(User(kakaoId = "feed_1", nickname = "멤버1"))
        member2 = userRepository.save(User(kakaoId = "feed_2", nickname = "멤버2"))
        stranger = userRepository.save(User(kakaoId = "feed_stranger", nickname = "외부인"))

        token1 = jwtTokenProvider.generateAccessToken(member1.id)
        token2 = jwtTokenProvider.generateAccessToken(member2.id)
        strangerToken = jwtTokenProvider.generateAccessToken(stranger.id)

        group = groupRepository.save(
            Group(name = "피드 모임", hostUserId = member1.id, inviteCode = "INVITE-FEED")
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = member1.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = member2.id, role = GroupRole.MEMBER))

        val today = DateTimeUtils.todayKst()
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = member1.id,
                title = "매일 글쓰기",
                description = "한 줄 일기",
                verificationCriteria = "일기 캡처",
                startDate = today.minusDays(1),
                endDate = today.plusDays(10)
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = member1.id, penaltyAmount = 5000)
        )

        verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = member1.id,
                targetDate = today,
                imageUrl = "https://s3.example.com/feed.jpg",
                comment = "오늘 글쓰기 완료했습니다!",
                isLate = false
            )
        )
    }

    @Test
    fun `DoD 3 등록된 인증이 모임 피드에 최신순으로 노출되고 작성자 정보와 댓글 수가 정확하다`() {
        // 댓글 1개 추가
        val newComment = VerificationComment(
            verification = verification,
            userId = member2.id,
            content = "응원합니다!"
        )
        verification.addComment(newComment)
        verificationCommentRepository.save(newComment)

        mockMvc.get("/api/v1/groups/${group.id}/feed") {
            header("Authorization", "Bearer $token2")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.items[0].id") { value(verification.id) }
            jsonPath("$.items[0].challengeTitle") { value("매일 글쓰기") }
            jsonPath("$.items[0].authorNickname") { value("멤버1") }
            jsonPath("$.items[0].imageUrl") { value("https://s3.example.com/feed.jpg") }
            jsonPath("$.items[0].comment") { value("오늘 글쓰기 완료했습니다!") }
            jsonPath("$.items[0].commentCount") { value(1) }
            jsonPath("$.items[0].isMine") { value(false) } // member2 시점
            jsonPath("$.hasNext") { value(false) }
        }
    }

    @Test
    fun `DoD 4 타 모임 사용자가 피드를 조회하려고 하면 403 Forbidden이 발생한다`() {
        mockMvc.get("/api/v1/groups/${group.id}/feed") {
            header("Authorization", "Bearer $strangerToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 3 모임원은 특정 인증에 댓글을 작성하고 조회할 수 있다`() {
        val request = CreateCommentRequest(content = "오늘 하루도 수고하셨어요!")

        // 1. 댓글 작성
        mockMvc.post("/api/v1/verifications/${verification.id}/comments") {
            header("Authorization", "Bearer $token2")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.content") { value("오늘 하루도 수고하셨어요!") }
            jsonPath("$.authorNickname") { value("멤버2") }
            jsonPath("$.isMine") { value(true) }
        }

        // 2. 댓글 목록 조회
        mockMvc.get("/api/v1/verifications/${verification.id}/comments") {
            header("Authorization", "Bearer $token1")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].content") { value("오늘 하루도 수고하셨어요!") }
            jsonPath("$[0].authorNickname") { value("멤버2") }
            jsonPath("$[0].isMine") { value(false) } // member1 시점
        }
    }

    @Test
    fun `DoD 4 타 모임 사용자가 댓글을 작성하거나 조회하려고 하면 403 Forbidden이 발생한다`() {
        val request = CreateCommentRequest(content = "외부인 댓글 시도")

        mockMvc.post("/api/v1/verifications/${verification.id}/comments") {
            header("Authorization", "Bearer $strangerToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
        }

        mockMvc.get("/api/v1/verifications/${verification.id}/comments") {
            header("Authorization", "Bearer $strangerToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 3 댓글 작성자는 본인의 댓글을 삭제할 수 있다`() {
        val comment = verificationCommentRepository.save(
            VerificationComment(
                verification = verification,
                userId = member2.id,
                content = "삭제할 댓글"
            )
        )

        mockMvc.delete("/api/v1/comments/${comment.id}") {
            header("Authorization", "Bearer $token2")
        }.andExpect {
            status { isNoContent() }
        }

        assertFalse(verificationCommentRepository.existsById(comment.id))
    }

    @Test
    fun `타인의 댓글을 삭제하려고 하면 403 Forbidden이 발생한다`() {
        val comment = verificationCommentRepository.save(
            VerificationComment(
                verification = verification,
                userId = member2.id,
                content = "멤버2의 댓글"
            )
        )

        mockMvc.delete("/api/v1/comments/${comment.id}") {
            header("Authorization", "Bearer $token1") // 멤버1이 삭제 시도
        }.andExpect {
            status { isForbidden() }
        }
    }
}
