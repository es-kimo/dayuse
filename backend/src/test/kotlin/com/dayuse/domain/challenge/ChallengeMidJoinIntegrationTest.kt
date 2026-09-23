@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.StartDateType
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.service.DailyRecordService
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
import org.junit.jupiter.api.Assertions.assertNotNull
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
class ChallengeMidJoinIntegrationTest {

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
    private lateinit var dailyRecordService: DailyRecordService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var nonMemberUser: User
    private lateinit var group: Group
    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var nonMemberToken: String

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "kakao_host_mid", nickname = "호스트"))
        memberUser = userRepository.save(User(kakaoId = "kakao_member_mid", nickname = "모임원"))
        nonMemberUser = userRepository.save(User(kakaoId = "kakao_other_mid", nickname = "외부인"))

        group = groupRepository.save(
            Group(
                name = "테스트 모임",
                hostUserId = hostUser.id,
                inviteCode = "MIDJOIN-TEST-01"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)
        nonMemberToken = "Bearer " + jwtTokenProvider.generateAccessToken(nonMemberUser.id)
    }

    @Test
    fun `DoD 1 진행 중인 챌린지에 중도 참여 프리뷰 조회 시 남은 일수와 시작 옵션이 정확히 제공된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "진행 중 챌린지",
                verificationCriteria = "인증 캡처",
                startDate = today.minusDays(3),
                endDate = today.plusDays(10)
            )
        )

        mockMvc.get("/api/v1/challenges/${challenge.id}/preview-join") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.challengeId") { value(challenge.id) }
            jsonPath("$.isStarted") { value(true) }
            jsonPath("$.options.length()") { value(2) } // TODAY, TOMORROW
            jsonPath("$.options[0].type") { value("TODAY") }
            jsonPath("$.options[0].remainingDays") { value(11) } // today ~ today+10 = 11일
            jsonPath("$.options[1].type") { value("TOMORROW") }
            jsonPath("$.options[1].remainingDays") { value(10) } // today+1 ~ today+10 = 10일
            jsonPath("$.options[1].isRecommended") { value(true) }
        }
    }

    @Test
    fun `DoD 1 모임원이 아닌 사용자가 프리뷰 및 참여 시도시 403 Forbidden 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "권한 검증 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5)
            )
        )

        mockMvc.get("/api/v1/challenges/${challenge.id}/preview-join") {
            header("Authorization", nonMemberToken)
        }.andExpect {
            status { isForbidden() }
        }

        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", nonMemberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(JoinChallengeRequest(penaltyAmount = 5000))
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `DoD 1 진행 중인 챌린지에 내일부터 옵션으로 중도 참여 성공한다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "중도 참여 테스트",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(5),
                endDate = today.plusDays(5)
            )
        )

        val request = JoinChallengeRequest(penaltyAmount = 5000, startDateType = StartDateType.TOMORROW)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.userId") { value(memberUser.id) }
            jsonPath("$.startDate") { value(today.plusDays(1).toString()) }
            jsonPath("$.status") { value("ACTIVE") }
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)
        assertNotNull(participant)
        assertEquals(today.plusDays(1), participant!!.startDate)
    }

    @Test
    fun `DoD 2 중도 참여자의 참여 전 날짜는 일일 기록이 생성되지 않고 캘린더에서 NOT_PARTICIPATED로 표시된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "기록 격리 테스트",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(4),
                endDate = today.plusDays(4)
            )
        )

        // 내일부터(tomorrow) 참여
        val request = JoinChallengeRequest(penaltyAmount = 5000, startDateType = StartDateType.TOMORROW)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }

        // DB에 실제 생성된 DailyRecord 확인: 참여자의 startDate(today+1) 이전 날짜는 없어야 함
        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)!!
        val records = dailyRecordRepository.findAllByChallengeParticipantId(participant.id)
        for (r in records) {
            assertEquals(false, r.date < participant.startDate)
        }

        // 캘린더 API 조회 시 참여 전 날짜(today-4 ~ today)는 NOT_PARTICIPATED로 매핑됨
        mockMvc.get("/api/v1/challenges/${challenge.id}/calendar") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.participants[0].records[0].status") { value("NOT_PARTICIPATED") }
        }
    }

    @Test
    fun `DoD 3 완료율이 본인 전체 수행일 수 대비 완료 일수로 정확히 계산된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "완료율 테스트",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(5),
                endDate = today.plusDays(4) // 전체 10일
            )
        )

        // 오늘부터 참여 (남은 일수: today ~ today+4 = 5일)
        val request = JoinChallengeRequest(penaltyAmount = 5000, startDateType = StartDateType.TODAY)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)!!
        // 오늘 기록 1건 완료 처리
        val recordToday = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, today)!!
        recordToday.verifyToday(100L)
        dailyRecordRepository.save(recordToday)

        // 챌린지 상세 조회 -> 5일 중 1일 완료이므로 20%
        mockMvc.get("/api/v1/challenges/${challenge.id}") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.participants[0].completionRate") { value(20) }
        }
    }

    @Test
    fun `DoD 4 본인 시작일 전에는 참여 취소 및 금액 수정이 가능하고, 시작 당일부터는 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "불변 규칙 테스트",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(2),
                endDate = today.plusDays(5)
            )
        )

        // 1. 내일부터(TOMORROW) 참여 신청 (시작일 = today + 1)
        val request = JoinChallengeRequest(penaltyAmount = 5000, startDateType = StartDateType.TOMORROW)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
        }

        // 2. 시작 전(오늘) 약정 금액 수정 -> 성공
        mockMvc.patch("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdatePenaltyAmountRequest(penaltyAmount = 10000))
        }.andExpect {
            status { isOk() }
            jsonPath("$.penaltyAmount") { value(10000) }
        }

        // 3. 시작 전(오늘) 참여 취소 -> 성공 (status = CANCELLED)
        mockMvc.delete("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isNoContent() }
        }

        val cancelledParticipant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)!!
        assertEquals(ParticipantStatus.CANCELLED, cancelledParticipant.status)

        // 4. 오늘부터(TODAY) 재참여 신청 (시작일 = today)
        val reJoinRequest = JoinChallengeRequest(penaltyAmount = 7000, startDateType = StartDateType.TODAY)
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(reJoinRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.status") { value("ACTIVE") }
            jsonPath("$.startDate") { value(today.toString()) }
            jsonPath("$.penaltyAmount") { value(7000) }
        }

        // 5. 시작 당일이 되었으므로 참여 취소 시도 -> 400 Bad Request 차단
        mockMvc.delete("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isBadRequest() }
        }

        // 6. 시작 당일이 되었으므로 금액 수정 시도 -> 400 Bad Request 차단
        mockMvc.patch("/api/v1/challenges/${challenge.id}/participants/me") {
            header("Authorization", memberToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(UpdatePenaltyAmountRequest(penaltyAmount = 15000))
        }.andExpect {
            status { isBadRequest() }
        }
    }
}
