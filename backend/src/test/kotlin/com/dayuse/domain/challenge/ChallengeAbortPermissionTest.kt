@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.AbortChallengeRequest
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChallengeAbortPermissionTest {

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

    private lateinit var hostUser: User
    private lateinit var creatorUser: User
    private lateinit var participantUser: User
    private lateinit var nonMemberUser: User

    private lateinit var hostToken: String
    private lateinit var creatorToken: String
    private lateinit var participantToken: String
    private lateinit var nonMemberToken: String

    private lateinit var group: Group
    private lateinit var challenge: Challenge

    @BeforeEach
    fun setUp() {
        val today = DateTimeUtils.todayKst()

        hostUser = userRepository.save(User(kakaoId = "kakao_host", nickname = "모임장"))
        creatorUser = userRepository.save(User(kakaoId = "kakao_creator", nickname = "생성자"))
        participantUser = userRepository.save(User(kakaoId = "kakao_participant", nickname = "참가자"))
        nonMemberUser = userRepository.save(User(kakaoId = "kakao_non_member", nickname = "외부인"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        creatorToken = "Bearer " + jwtTokenProvider.generateAccessToken(creatorUser.id)
        participantToken = "Bearer " + jwtTokenProvider.generateAccessToken(participantUser.id)
        nonMemberToken = "Bearer " + jwtTokenProvider.generateAccessToken(nonMemberUser.id)

        group = groupRepository.save(Group(name = "테스트 모임", hostUserId = hostUser.id, inviteCode = "ABORT_PERM_1"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = creatorUser.id, role = GroupRole.MEMBER))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = participantUser.id, role = GroupRole.MEMBER))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "중단 테스트 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today,
                endDate = today.plusDays(13),
                periodType = PeriodType.DAILY
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = creatorUser.id,
                penaltyAmount = 5000,
                startDate = today
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = participantUser.id,
                penaltyAmount = 5000,
                startDate = today
            )
        )
    }

    @Test
    fun `챌린지 생성자는 챌린지를 중단할 수 있다`() {
        val request = AbortChallengeRequest(reason = "생성자 사정으로 인한 중단")

        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", creatorToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ABORTED") }
            jsonPath("$.abortedBy") { value(creatorUser.id) }
            jsonPath("$.abortReason") { value("생성자 사정으로 인한 중단") }
            jsonPath("$.canAbort") { value(false) }
        }
    }

    @Test
    fun `모임장은 자신이 만들지 않은 챌린지도 중단할 수 있다`() {
        val request = AbortChallengeRequest(reason = "모임장 직권 중단")

        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ABORTED") }
            jsonPath("$.abortedBy") { value(hostUser.id) }
            jsonPath("$.abortReason") { value("모임장 직권 중단") }
        }
    }

    @Test
    fun `일반 참가자는 챌린지를 중단할 수 없고 403 에러가 발생한다`() {
        val request = AbortChallengeRequest(reason = "참가자 중단 시도")

        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", participantToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `모임원이 아닌 제3자는 챌린지를 중단할 수 없고 403 에러가 발생한다`() {
        val request = AbortChallengeRequest(reason = "외부인 중단 시도")

        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            header("Authorization", nonMemberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isForbidden() }
        }
    }
}
