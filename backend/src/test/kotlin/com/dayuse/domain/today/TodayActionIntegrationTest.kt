@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.today

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
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class TodayActionIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

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

    private lateinit var memberUser: User
    private lateinit var strangerUser: User
    private lateinit var memberToken: String
    private lateinit var strangerToken: String
    private lateinit var group: Group
    private lateinit var activeChallenge: Challenge

    @BeforeEach
    fun setUp() {
        memberUser = userRepository.save(User(kakaoId = "member_1", nickname = "모임원"))
        strangerUser = userRepository.save(User(kakaoId = "stranger_1", nickname = "외부인"))

        memberToken = jwtTokenProvider.generateAccessToken(memberUser.id)
        strangerToken = jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(
            Group(name = "테스트 모임", hostUserId = memberUser.id, inviteCode = "INVITE-1234")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER)
        )

        val today = DateTimeUtils.todayKst()
        activeChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = memberUser.id,
                title = "매일 1만보 걷기",
                description = "건강 챌린지",
                verificationCriteria = "만보기 캡처",
                startDate = today.minusDays(1),
                endDate = today.plusDays(10)
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = activeChallenge.id, userId = memberUser.id, penaltyAmount = 5000)
        )
    }

    @Test
    fun `모임원이 오늘 할 일 목록을 조회하면 참여 중인 챌린지의 오늘 상태를 확인하고 인증 전에는 canVerify가 true이다`() {
        mockMvc.get("/api/v1/groups/${group.id}/today") {
            header("Authorization", "Bearer $memberToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].challengeId") { value(activeChallenge.id) }
            jsonPath("$[0].challengeTitle") { value("매일 1만보 걷기") }
            jsonPath("$[0].isCompletedToday") { value(false) }
            jsonPath("$[0].canVerify") { value(true) }
            jsonPath("$[0].myVerification") { isEmpty() }
        }
    }

    @Test
    fun `모임원이 오늘 인증을 완료하면 isCompletedToday가 true이고 myVerification 요약 정보가 포함된다`() {
        val today = DateTimeUtils.todayKst()
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = activeChallenge.id,
                userId = memberUser.id,
                targetDate = today,
                imageUrl = "https://s3.example.com/walk.jpg",
                comment = "오늘 1만보 완료!",
                isLate = false
            )
        )

        mockMvc.get("/api/v1/groups/${group.id}/today") {
            header("Authorization", "Bearer $memberToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].challengeId") { value(activeChallenge.id) }
            jsonPath("$[0].isCompletedToday") { value(true) }
            jsonPath("$[0].canVerify") { value(false) }
            jsonPath("$[0].myVerification.imageUrl") { value("https://s3.example.com/walk.jpg") }
            jsonPath("$[0].myVerification.comment") { value("오늘 1만보 완료!") }
            jsonPath("$[0].myVerification.isLate") { value(false) }
        }
    }

    @Test
    fun `비모임원이 오늘 할 일을 조회하려고 하면 403 Forbidden을 반환한다`() {
        mockMvc.get("/api/v1/groups/${group.id}/today") {
            header("Authorization", "Bearer $strangerToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isForbidden() }
        }
    }
}
