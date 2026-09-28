@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.AbortChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.RestartChallengeRequest
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChallengeAbortStateTransitionTest {

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
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var creatorUser: User
    private lateinit var newMember: User
    private lateinit var creatorToken: String
    private lateinit var newMemberToken: String
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        creatorUser = userRepository.save(User(kakaoId = "kakao_creator", nickname = "생성자"))
        newMember = userRepository.save(User(kakaoId = "kakao_new", nickname = "신규회원"))

        creatorToken = "Bearer " + jwtTokenProvider.generateAccessToken(creatorUser.id)
        newMemberToken = "Bearer " + jwtTokenProvider.generateAccessToken(newMember.id)

        group = groupRepository.save(Group(name = "테스트 모임", hostUserId = creatorUser.id, inviteCode = "ABORT_STATE_1"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = creatorUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = newMember.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `시작 전인 챌린지도 정상적으로 중단할 수 있다`() {
        val today = DateTimeUtils.todayKst()
        val notStartedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "시작 전 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.plusDays(3),
                endDate = today.plusDays(16),
                periodType = PeriodType.DAILY
            )
        )

        mockMvc.post("/api/v1/challenges/${notStartedChallenge.id}/abort") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(AbortChallengeRequest(reason = "시작 전 취소 사유"))
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ABORTED") }
            jsonPath("$.abortedAt") { isNotEmpty() }
        }
    }

    @Test
    fun `이미 자연 종료된 챌린지는 중단할 수 없고 400 에러가 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val endedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "종료된 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(20),
                endDate = today.minusDays(5),
                periodType = PeriodType.DAILY
            )
        )

        mockMvc.post("/api/v1/challenges/${endedChallenge.id}/abort") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(AbortChallengeRequest())
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `이미 중단된 챌린지를 중복 중단할 수 없고 400 에러가 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "진행 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )

        // 1차 중단
        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(AbortChallengeRequest(reason = "1차 중단"))
        }.andExpect {
            status { isOk() }
        }

        // 2차 중복 중단 시도
        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(AbortChallengeRequest(reason = "2차 중단 시도"))
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `중단된 챌린지에는 신규 참가자가 참여할 수 없다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "진행 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )
        challenge.abort(creatorUser.id, "중단됨")
        challengeRepository.save(challenge)

        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", newMemberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(JoinChallengeRequest(penaltyAmount = 5000))
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `중단된 챌린지는 조건을 수정할 수 없다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "진행 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )
        challenge.abort(creatorUser.id, "중단됨")
        challengeRepository.save(challenge)

        mockMvc.patch("/api/v1/challenges/${challenge.id}") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdateChallengeRequest(title = "새 제목"))
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `중단된 챌린지에는 신규 인증을 등록할 수 없다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "진행 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = creatorUser.id, startDate = today.minusDays(1))
        )
        challenge.abort(creatorUser.id, "중단됨")
        challengeRepository.save(challenge)

        mockMvc.post("/api/v1/verifications") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                CreateVerificationRequest(
                    challengeId = challenge.id,
                    imageUrl = "https://dayuse.s3.ap-northeast-2.amazonaws.com/verifications/1/1/test.jpg"
                )
            )
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `중단된 챌린지도 새 챌린지로 다시 만들기는 가능하다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "원래 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(3),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )
        challenge.abort(creatorUser.id, "중단 사유")
        challengeRepository.save(challenge)

        val restartReq = RestartChallengeRequest(
            title = "원래 챌린지 다시 시작",
            verificationCriteria = "인증 기준",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            myPenaltyAmount = 5000
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/restart") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(restartReq)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("원래 챌린지 다시 시작") }
            jsonPath("$.status") { value("NOT_STARTED") }
        }
    }
}
