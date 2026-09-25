// 테스트 시나리오를 한글 이름으로 표현합니다.
@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
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
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChallengeBulkParticipantIntegrationTest {

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
    private lateinit var member1User: User
    private lateinit var member2User: User
    private lateinit var strangerUser: User

    private lateinit var hostToken: String
    private lateinit var member1Token: String
    private lateinit var member2Token: String
    private lateinit var strangerToken: String

    private lateinit var group: Group
    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        challengeParticipantRepository.deleteAll()
        challengeRepository.deleteAll()
        groupMemberRepository.deleteAll()
        groupRepository.deleteAll()
        userRepository.deleteAll()

        hostUser = userRepository.save(
            User(kakaoId = "host-bulk-123", nickname = "방장", profileImageUrl = null)
        )
        member1User = userRepository.save(
            User(kakaoId = "member1-bulk-456", nickname = "모임원1", profileImageUrl = null)
        )
        member2User = userRepository.save(
            User(kakaoId = "member2-bulk-789", nickname = "모임원2", profileImageUrl = null)
        )
        strangerUser = userRepository.save(
            User(kakaoId = "stranger-bulk-000", nickname = "외부인", profileImageUrl = null)
        )

        hostToken = jwtTokenProvider.generateAccessToken(hostUser.id)
        member1Token = jwtTokenProvider.generateAccessToken(member1User.id)
        member2Token = jwtTokenProvider.generateAccessToken(member2User.id)
        strangerToken = jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(
            Group(name = "일괄 등록 테스트 모임", hostUserId = hostUser.id)
        )

        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST)
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = member1User.id, role = GroupRole.MEMBER)
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = member2User.id, role = GroupRole.MEMBER)
        )
    }

    @Test
    fun `모임원을 다중 선택하여 챌린지 생성 시 모든 참가자가 정상 등록된다`() {
        val request = CreateChallengeRequest(
            title = "함께하는 아침 기상 챌린지",
            description = "모두 함께 기상합시다",
            verificationCriteria = "기상 시계 사진",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            periodType = PeriodType.DAILY,
            myPenaltyAmount = 5000,
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 10000),
                CreateParticipantRequest(userId = member2User.id, penaltyAmount = 15000)
            )
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("함께하는 아침 기상 챌린지") }
            jsonPath("$.participants.length()") { value(3) }
            jsonPath("$.participants[?(@.userId == ${hostUser.id})].penaltyAmount") { value(5000) }
            jsonPath("$.participants[?(@.userId == ${hostUser.id})].isCreator") { value(true) }
            jsonPath("$.participants[?(@.userId == ${member1User.id})].penaltyAmount") { value(10000) }
            jsonPath("$.participants[?(@.userId == ${member1User.id})].isCreator") { value(false) }
            jsonPath("$.participants[?(@.userId == ${member2User.id})].penaltyAmount") { value(15000) }
            jsonPath("$.participants[?(@.userId == ${member2User.id})].isCreator") { value(false) }
        }

        // DB 검증
        val participants = challengeParticipantRepository.findAll()
        assertEquals(3, participants.size)
        participants.forEach {
            assertEquals(today.plusDays(1), it.startDate)
            assertEquals(ParticipantStatus.ACTIVE, it.status)
        }
    }

    @Test
    fun `participants에 생성자 본인이 누락되어도 서버가 자동 보정하여 포함 등록한다`() {
        val request = CreateChallengeRequest(
            title = "생성자 누락 자동 보정 챌린지",
            verificationCriteria = "사진 인증",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            myPenaltyAmount = 7000,
            participants = listOf(
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 12000)
            )
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.participants.length()") { value(2) }
            jsonPath("$.participants[?(@.userId == ${hostUser.id})].penaltyAmount") { value(7000) }
            jsonPath("$.participants[?(@.userId == ${hostUser.id})].isCreator") { value(true) }
            jsonPath("$.participants[?(@.userId == ${member1User.id})].penaltyAmount") { value(12000) }
        }

        val participants = challengeParticipantRepository.findAll()
        assertEquals(2, participants.size)
    }

    @Test
    fun `모임에 속하지 않은 비회원이 포함된 경우 400 에러와 함께 원자적으로 전체 롤백된다`() {
        val initialChallengeCount = challengeRepository.count()
        val initialParticipantCount = challengeParticipantRepository.count()

        val request = CreateChallengeRequest(
            title = "비회원 포함 비정상 챌린지",
            verificationCriteria = "사진 인증",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = strangerUser.id, penaltyAmount = 5000)
            )
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("모임에 속하지 않은 회원이 포함되어 있습니다.") }
        }

        // All-or-Nothing 무결성 검증: 챌린지와 참가자가 전혀 생성되지 않아야 함
        assertEquals(initialChallengeCount, challengeRepository.count())
        assertEquals(initialParticipantCount, challengeParticipantRepository.count())
    }

    @Test
    fun `participants에 중복된 userId가 전달되면 400 에러를 반환한다`() {
        val request = CreateChallengeRequest(
            title = "중복 참여자 챌린지",
            verificationCriteria = "사진 인증",
            startDate = today.plusDays(1),
            endDate = today.plusDays(14),
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 10000)
            )
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("중복된 참가자가 포함되어 있습니다.") }
        }
    }

    @Test
    fun `일괄 등록된 참가자는 자신의 수행 시작일 전에는 자율적으로 참여를 취소하거나 약정 금액을 수정할 수 있다`() {
        val request = CreateChallengeRequest(
            title = "시작 전 취소 및 금액 수정 가능 챌린지",
            verificationCriteria = "사진 인증",
            startDate = today.plusDays(2),
            endDate = today.plusDays(15),
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 10000),
                CreateParticipantRequest(userId = member2User.id, penaltyAmount = 15000)
            )
        )

        val createResult = mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andReturn()

        val challengeId = objectMapper.readTree(createResult.response.contentAsString).get("id").asLong()

        // 1. member1이 시작 전 자율 참여 취소
        mockMvc.delete("/api/v1/challenges/$challengeId/participants/me") {
            header("Authorization", "Bearer $member1Token")
        }.andExpect {
            status { isNoContent() }
        }

        val cancelledParticipant = challengeParticipantRepository.findAll()
            .first { it.challengeId == challengeId && it.userId == member1User.id }
        assertEquals(ParticipantStatus.CANCELLED, cancelledParticipant.status)

        // 2. member2가 시작 전 약정 금액 수정
        val updatePenaltyRequest = UpdatePenaltyAmountRequest(penaltyAmount = 30000)
        mockMvc.patch("/api/v1/challenges/$challengeId/participants/me") {
            header("Authorization", "Bearer $member2Token")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updatePenaltyRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.penaltyAmount") { value(30000) }
        }

        val updatedParticipant = challengeParticipantRepository.findAll()
            .first { it.challengeId == challengeId && it.userId == member2User.id }
        assertEquals(30000, updatedParticipant.penaltyAmount)
    }

    @Test
    fun `당일 시작 챌린지로 일괄 등록된 참가자는 생성 즉시 조건이 확정되어 취소나 금액 수정이 불가하다`() {
        val request = CreateChallengeRequest(
            title = "오늘 바로 시작하는 당일 챌린지",
            verificationCriteria = "사진 인증",
            startDate = today,
            endDate = today.plusDays(13),
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 5000),
                CreateParticipantRequest(userId = member1User.id, penaltyAmount = 10000)
            )
        )

        val createResult = mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andReturn()

        val challengeId = objectMapper.readTree(createResult.response.contentAsString).get("id").asLong()

        // 1. 시작 당일 참여 취소 시도 -> 실패 (400)
        mockMvc.delete("/api/v1/challenges/$challengeId/participants/me") {
            header("Authorization", "Bearer $member1Token")
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("이미 시작된 참여는 취소할 수 없습니다.") }
        }

        // 2. 시작 당일 금액 변경 시도 -> 실패 (400)
        val updatePenaltyRequest = UpdatePenaltyAmountRequest(penaltyAmount = 20000)
        mockMvc.patch("/api/v1/challenges/$challengeId/participants/me") {
            header("Authorization", "Bearer $member1Token")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updatePenaltyRequest)
        }.andExpect {
            status { isBadRequest() }
            jsonPath("$.message") { value("이미 시작된 참여는 약정 금액을 변경할 수 없습니다.") }
        }
    }
}
