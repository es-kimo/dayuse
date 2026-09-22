// 테스트 시나리오를 한글 이름으로 표현합니다.
@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
import com.dayuse.domain.challenge.service.ChallengeService
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ChallengeIntegrationTest {

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
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var strangerUser: User

    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var strangerToken: String

    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "kakao_host", nickname = "모임장"))
        memberUser = userRepository.save(User(kakaoId = "kakao_member", nickname = "모임원"))
        strangerUser = userRepository.save(User(kakaoId = "kakao_stranger", nickname = "외부인"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)
        strangerToken = "Bearer " + jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(
            Group(
                name = "챌린지 테스트 모임",
                hostUserId = hostUser.id,
                inviteCode = "CHALLENGE-INVITE-01"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `DoD 1 모임원이 14일 기본 기간과 5000원 기본 금액으로 챌린지를 정상 생성하고 생성자가 자동 참여된다`() {
        val today = DateTimeUtils.todayKst()
        val request = CreateChallengeRequest(
            title = "매일 아침 스트레칭",
            description = "아침 10분 스트레칭 후 인증사진 업로드",
            verificationCriteria = "매일 스트레칭 인증 사진 1장",
            startDate = today.plusDays(1),
            endDate = null,
            myPenaltyAmount = 5000
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("매일 아침 스트레칭") }
            jsonPath("$.startDate") { value(today.plusDays(1).toString()) }
            jsonPath("$.endDate") { value(today.plusDays(14).toString()) } // startDate + 13일 (14일간)
            jsonPath("$.isCreator") { value(true) }
            jsonPath("$.isParticipating") { value(true) }
            jsonPath("$.myPenaltyAmount") { value(5000) }
            jsonPath("$.participants[0].userId") { value(hostUser.id) }
            jsonPath("$.participants[0].isCreator") { value(true) }
        }
    }

    @Test
    fun `DoD 2 챌린지 시작 전 다른 모임원이 각자의 약정 금액을 설정하고 참여하거나 취소할 수 있다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "1일 1알고리즘",
                verificationCriteria = "깃허브 PR 링크 제출",
                startDate = today.plusDays(2)
            )
        )

        // memberUser가 10,000원으로 참여 신청
        val joinRequest = JoinChallengeRequest(penaltyAmount = 10000)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(joinRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.userId") { value(memberUser.id) }
            jsonPath("$.penaltyAmount") { value(10000) }
        }

        // 챌린지 상세에서 참여자 2명 확인
        val detailAfterJoin = challengeService.getChallengeDetail(challenge.id, hostUser.id)
        assertEquals(2, detailAfterJoin.participants.size)

        // memberUser 참여 취소
        mockMvc.delete("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isNoContent() }
        }

        val detailAfterLeave = challengeService.getChallengeDetail(challenge.id, hostUser.id)
        assertEquals(1, detailAfterLeave.participants.size)
    }

    @Test
    fun `DoD 3 챌린지 시작 후 추가 참여 및 참여 취소 시 400 Bad Request 차단된다`() {
        val today = DateTimeUtils.todayKst()
        // 오늘 시작한 챌린지 (IN_PROGRESS)
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "이미 시작된 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today,
                endDate = today.plusDays(13)
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = hostUser.id, penaltyAmount = 5000, startDate = challenge.startDate)
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser.id, penaltyAmount = 5000, startDate = challenge.startDate)
        )

        // 이미 참여 중인 사용자 중복 참여 시도 -> 409 Conflict
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(JoinChallengeRequest(penaltyAmount = 3000))
        }.andExpect {
            status { isConflict() }
        }

        // 기존 참여자(이미 시작됨) 참여 취소 시도 -> 400 Bad Request
        mockMvc.delete("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `DoD 4 챌린지 시작 후 삭제 시 400 Bad Request 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "삭제 불가 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today,
                endDate = today.plusDays(13)
            )
        )

        mockMvc.delete("/api/v1/challenges/${challenge.id}") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `DoD 5 챌린지 시작 후 조건 수정 시 제목과 설명 외 필드 변경 시 400 Bad Request 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "시작된 챌린지",
                description = "설명",
                verificationCriteria = "기준",
                startDate = today,
                endDate = today.plusDays(13)
            )
        )

        val invalidUpdate = UpdateChallengeRequest(
            title = "새 제목",
            verificationCriteria = "변경된 기준 시도"
        )

        mockMvc.patch("/api/v1/challenges/${challenge.id}") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(invalidUpdate)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `DoD 6 챌린지 시작 후 제목과 설명만 수정하면 정상 200 OK 처리된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "시작된 챌린지",
                description = "설명",
                verificationCriteria = "기준",
                startDate = today,
                endDate = today.plusDays(13)
            )
        )

        val validUpdate = UpdateChallengeRequest(
            title = "업데이트된 제목",
            description = "업데이트된 설명"
        )

        mockMvc.patch("/api/v1/challenges/${challenge.id}") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(validUpdate)
        }.andExpect {
            status { isOk() }
            jsonPath("$.title") { value("업데이트된 제목") }
            jsonPath("$.description") { value("업데이트된 설명") }
            jsonPath("$.verificationCriteria") { value("기준") }
        }
    }

    @Test
    fun `DoD 7 비모임원이 챌린지 조회 또는 생성 시도시 403 Forbidden 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "모임원 전용 챌린지",
                verificationCriteria = "기준",
                startDate = today.plusDays(1)
            )
        )

        // 비모임원 strangerUser의 생성 시도 -> 403
        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", strangerToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                CreateChallengeRequest(
                    title = "외부인의 챌린지",
                    verificationCriteria = "기준",
                    startDate = today.plusDays(1)
                )
            )
        }.andExpect {
            status { isForbidden() }
        }

        // 비모임원 strangerUser의 상세 조회 시도 -> 403
        mockMvc.get("/api/v1/challenges/${challenge.id}") {
            header("Authorization", strangerToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 8 생성자가 아닌 일반 모임원이 챌린지 수정 또는 삭제 시도시 403 Forbidden 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "호스트의 챌린지",
                verificationCriteria = "기준",
                startDate = today.plusDays(1)
            )
        )

        // memberUser의 수정 시도 -> 403
        mockMvc.patch("/api/v1/challenges/${challenge.id}") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdateChallengeRequest(title = "해킹 시도"))
        }.andExpect {
            status { isForbidden() }
        }

        // memberUser의 삭제 시도 -> 403
        mockMvc.delete("/api/v1/challenges/${challenge.id}") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 9 시작 전 참여자의 본인 미수행 약정 금액 변경 API 호출 시 정상 반영된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "약정 금액 변경 테스트",
                verificationCriteria = "기준",
                startDate = today.plusDays(3),
                myPenaltyAmount = 5000
            )
        )

        val updatePenalty = UpdatePenaltyAmountRequest(penaltyAmount = 15000)

        mockMvc.patch("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(updatePenalty)
        }.andExpect {
            status { isOk() }
            jsonPath("$.penaltyAmount") { value(15000) }
        }
    }

    @Test
    fun `DoD 10 챌린지 생성자는 참여 취소를 할 수 없으며 400 Bad Request 처리된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "생성자 탈퇴 불가 챌린지",
                verificationCriteria = "기준",
                startDate = today.plusDays(1)
            )
        )

        mockMvc.delete("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isBadRequest() }
        }
    }
}
