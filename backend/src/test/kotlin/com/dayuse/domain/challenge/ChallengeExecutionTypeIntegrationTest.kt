@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
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
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
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
class ChallengeExecutionTypeIntegrationTest {

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
    private lateinit var memberUser: User
    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "kakao_host_exec", nickname = "모임장"))
        memberUser = userRepository.save(User(kakaoId = "kakao_member_exec", nickname = "모임원"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)

        group = groupRepository.save(
            Group(
                name = "수행방식 테스트 모임",
                hostUserId = hostUser.id,
                inviteCode = "EXEC-TYPE-TEST-01"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `함께하기 챌린지 생성 시 executionType이 TOGETHER로 저장되고 약정 벌금이 0원 처리된다`() {
        val today = DateTimeUtils.todayKst()
        val request = CreateChallengeRequest(
            title = "다함께 물 마시기",
            description = "누구든 하루 한 번 물마시기 인증",
            verificationCriteria = "물컵 인증 사진",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            executionType = ExecutionType.TOGETHER,
            myPenaltyAmount = 10000 // 함께하기이므로 무시되고 0원 처리되어야 함
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.executionType") { value("TOGETHER") }
            jsonPath("$.myPenaltyAmount") { isEmpty() } // 함께하기는 벌금 미노출(null)
            jsonPath("$.participants[0].penaltyAmount") { value(0) }
        }

        val created = challengeRepository.findAllByGroupId(group.id).first()
        assertEquals(ExecutionType.TOGETHER, created.executionType)

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(created.id, hostUser.id)!!
        assertEquals(0, participant.penaltyAmount)
    }

    @Test
    fun `함께하기 챌린지에 새 참여자가 참여하면 약정 벌금이 0원으로 설정된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "함께 조깅",
                verificationCriteria = "조깅 인증",
                startDate = today.plusDays(1),
                endDate = today.plusDays(14),
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 0,
                startDate = challenge.startDate
            )
        )

        val joinRequest = JoinChallengeRequest(
            penaltyAmount = 5000 // 요청값과 무관하게 0원으로 등록되어야 함
        )

        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(joinRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.penaltyAmount") { value(0) }
        }

        val memberParticipant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)!!
        assertEquals(0, memberParticipant.penaltyAmount)
    }

    @Test
    fun `함께하기 챌린지에서는 약정 벌금 수정 시도 시 400 에러가 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "함께 독서",
                verificationCriteria = "독서 인증",
                startDate = today.plusDays(1),
                endDate = today.plusDays(14),
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 0,
                startDate = challenge.startDate
            )
        )

        val updatePenaltyRequest = UpdatePenaltyAmountRequest(penaltyAmount = 3000)

        mockMvc.patch("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updatePenaltyRequest)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("함께하기 챌린지는 약정 벌금을 변경할 수 없습니다.") }
        }
    }

    @Test
    fun `챌린지 수정 시 executionType을 변경하려 하면 400 에러가 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "원래 각자하기 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.plusDays(2),
                endDate = today.plusDays(14),
                executionType = ExecutionType.INDIVIDUAL
            )
        )

        val updateRequest = UpdateChallengeRequest(
            title = "수정하려는 제목",
            executionType = ExecutionType.TOGETHER
        )

        mockMvc.patch("/api/v1/challenges/${challenge.id}") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updateRequest)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("챌린지 수행 방식은 수정할 수 없습니다.") }
        }
    }
}
