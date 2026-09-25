@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.RestartChallengeRequest
import com.dayuse.domain.dailyrecord.DailyRecordRepository
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
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChallengeRestartIntegrationTest {

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
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var member1: User
    private lateinit var member2: User
    private lateinit var nonMember: User

    private lateinit var member1Token: String
    private lateinit var member2Token: String
    private lateinit var nonMemberToken: String

    private lateinit var group: Group
    private lateinit var endedChallenge: Challenge
    private lateinit var inProgressChallenge: Challenge

    @BeforeEach
    fun setUp() {
        val today = DateTimeUtils.todayKst()

        member1 = userRepository.save(User(kakaoId = "kakao_m1", nickname = "멤버1"))
        member2 = userRepository.save(User(kakaoId = "kakao_m2", nickname = "멤버2"))
        nonMember = userRepository.save(User(kakaoId = "kakao_stranger", nickname = "외부인"))

        member1Token = "Bearer " + jwtTokenProvider.generateAccessToken(member1.id)
        member2Token = "Bearer " + jwtTokenProvider.generateAccessToken(member2.id)
        nonMemberToken = "Bearer " + jwtTokenProvider.generateAccessToken(nonMember.id)

        group = groupRepository.save(
            Group(
                name = "테스트 모임",
                hostUserId = member1.id,
                inviteCode = "RESTART123"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = member1.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = member2.id, role = GroupRole.MEMBER))

        // 종료된 챌린지 (14일간 진행되었던 챌린지)
        endedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = member1.id,
                title = "14일간 독서하기",
                description = "매일 30분 책 읽기",
                verificationCriteria = "책 사진과 페이지 인증",
                startDate = today.minusDays(20),
                endDate = today.minusDays(7)
            )
        )

        // member1: 10,000원 약정으로 참여했음
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = endedChallenge.id,
                userId = member1.id,
                penaltyAmount = 10000,
                startDate = endedChallenge.startDate
            )
        )
        // member2: 15,000원 약정으로 참여했음
        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = endedChallenge.id,
                userId = member2.id,
                penaltyAmount = 15000,
                startDate = endedChallenge.startDate
            )
        )

        // 진행 중인 챌린지
        inProgressChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = member1.id,
                title = "진행 중 챌린지",
                description = "진행 중",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(2),
                endDate = today.plusDays(5)
            )
        )
    }

    @Test
    fun `종료되지 않은 챌린지의 재시작 템플릿 조회 시 400 Bad Request가 발생한다`() {
        mockMvc.get("/api/v1/groups/${group.id}/challenges/${inProgressChallenge.id}/restart-template") {
            header("Authorization", member1Token)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `모임 멤버가 아닌 사용자가 재시작 템플릿 조회 시 403 Forbidden이 발생한다`() {
        mockMvc.get("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart-template") {
            header("Authorization", nonMemberToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `종료된 챌린지의 재시작 템플릿을 정상 조회하며 사용자 참여 벌금과 기간이 올바르게 제안된다`() {
        val today = DateTimeUtils.todayKst()

        mockMvc.get("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart-template") {
            header("Authorization", member1Token)
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("14일간 독서하기") }
            jsonPath("$.description") { value("매일 30분 책 읽기") }
            jsonPath("$.verificationCriteria") { value("책 사진과 페이지 인증") }
            jsonPath("$.durationDays") { value(14) }
            jsonPath("$.suggestedStartDate") { value(today.plusDays(1).toString()) }
            jsonPath("$.suggestedEndDate") { value(today.plusDays(14).toString()) }
            jsonPath("$.suggestedPenaltyAmount") { value(10000) }
        }

        // member2의 경우 자신이 참여했던 15,000원이 제안되어야 함
        mockMvc.get("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart-template") {
            header("Authorization", member2Token)
        }.andExpect {
            status { isOk() }
            jsonPath("$.suggestedPenaltyAmount") { value(15000) }
        }
    }

    @Test
    fun `종료된 챌린지를 다시 시작하면 새 챌린지가 생성되고 생성자만 자동 참여된다`() {
        val today = DateTimeUtils.todayKst()
        val nextStart = today.plusDays(1)
        val nextEnd = today.plusDays(14)

        val request = RestartChallengeRequest(
            title = "14일간 독서하기 시즌2",
            description = "새로운 마음으로 독서",
            verificationCriteria = "책 사진 인증",
            startDate = nextStart,
            endDate = nextEnd,
            myPenaltyAmount = 20000
        )

        val response = mockMvc.post("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
            header("Authorization", member1Token)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("14일간 독서하기 시즌2") }
            jsonPath("$.isCreator") { value(true) }
            jsonPath("$.isParticipating") { value(true) }
            jsonPath("$.myPenaltyAmount") { value(20000) }
        }.andReturn()

        val json = objectMapper.readTree(response.response.contentAsString)
        val newChallengeId = json.get("id").asLong()

        assertNotEquals(endedChallenge.id, newChallengeId)

        // 신규 챌린지의 참여자는 오직 member1뿐이어야 함
        val participants = challengeParticipantRepository.findAllByChallengeId(newChallengeId)
        assertEquals(1, participants.size)
        assertEquals(member1.id, participants[0].userId)
        assertEquals(20000, participants[0].penaltyAmount)

        // 원본 챌린지의 참여자 2명은 그대로 보존되어야 함
        val originalParticipants = challengeParticipantRepository.findAllByChallengeId(endedChallenge.id)
        assertEquals(2, originalParticipants.size)

        // 새 참여자의 DailyRecord가 생성되었는지 확인
        val dailyRecords = dailyRecordRepository.findAllByChallengeParticipantId(participants[0].id)
        assertEquals(14, dailyRecords.size)
    }

    @Test
    fun `모임 멤버가 아닌 사용자가 챌린지 재시작 시 403 Forbidden이 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val request = RestartChallengeRequest(
            title = "외부인의 재시작 시도",
            verificationCriteria = "인증 기준",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14)
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
            header("Authorization", nonMemberToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `종료되지 않은 챌린지 재시작 시 400 Bad Request가 발생한다`() {
        val today = DateTimeUtils.todayKst()
        val request = RestartChallengeRequest(
            title = "진행 중 재시작 시도",
            verificationCriteria = "인증 기준",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14)
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges/${inProgressChallenge.id}/restart") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
            header("Authorization", member1Token)
        }.andExpect {
            status { isBadRequest() }
        }
    }
}
