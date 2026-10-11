@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.service.ChallengeResultService
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
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
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
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("챌린지 종료 결과 및 집계 통합 테스트")
class ChallengeResultIntegrationTest {

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
    private lateinit var challengeResultService: ChallengeResultService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var memberUser: User
    private lateinit var outsiderUser: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var memberToken: String
    private lateinit var outsiderToken: String

    @BeforeEach
    fun setUp() {
        memberUser = userRepository.save(
            User(kakaoId = "1001", nickname = "멤버유저", profileImageUrl = null)
        )
        outsiderUser = userRepository.save(
            User(kakaoId = "1002", nickname = "외부유저", profileImageUrl = null)
        )

        memberToken = jwtTokenProvider.generateAccessToken(memberUser.id)
        outsiderToken = jwtTokenProvider.generateAccessToken(outsiderUser.id)

        group = groupRepository.save(
            Group(name = "결과테스트모임", hostUserId = memberUser.id, inviteCode = "INVITE-RES-12345")
        )

        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER)
        )

        // 2026-10-01 ~ 2026-10-03 종료된 3일 챌린지
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = memberUser.id,
                title = "러닝 챌린지",
                verificationCriteria = "인증 기준",
                startDate = LocalDate.of(2026, 10, 1),
                endDate = LocalDate.of(2026, 10, 3),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL
            )
        )

        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = memberUser.id,
                startDate = LocalDate.of(2026, 10, 1),
                penaltyAmount = 1000
            )
        )

        // 3일 중 2일 유효 인증
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = memberUser.id,
                targetDate = LocalDate.of(2026, 10, 1),
                imageUrl = "https://example.com/1.jpg"
            )
        )
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = memberUser.id,
                targetDate = LocalDate.of(2026, 10, 2),
                imageUrl = "https://example.com/2.jpg"
            )
        )
    }

    @Test
    @DisplayName("보안: 비멤버가 챌린지 결과 조회 시 403 Forbidden 반환 (IDOR 차단)")
    fun testGetResultUnauthorizedAccessForbidden() {
        mockMvc.get("/api/v1/groups/${group.id}/challenges/${challenge.id}/result") {
            header("Authorization", "Bearer $outsiderToken")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @DisplayName("결과 조회: 멤버가 조회 시 잠정/확정 상태 및 정책 버전('v1')이 포함된 결과 반환")
    fun testGetResultSuccess() {
        // 2026-10-04 10:00 (마지막 수행일 10/3 익일 09:00 경과) 시점에 집계
        val confirmationTime = LocalDateTime.of(2026, 10, 4, 10, 0)
        challengeResultService.aggregateAndSave(challenge.id, confirmationTime)

        mockMvc.get("/api/v1/groups/${group.id}/challenges/${challenge.id}/result") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.challengeId") { value(challenge.id) }
            jsonPath("$.groupId") { value(group.id) }
            jsonPath("$.status") { value("CONFIRMED") }
            jsonPath("$.policyVersion") { value("v1") }
            jsonPath("$.totalTargetCount") { value(3) }
            jsonPath("$.totalCompletedCount") { value(2) }
            jsonPath("$.achievementRate") { value(66.67) }
            jsonPath("$.isSuccess") { value(false) }
            jsonPath("$.participants[0].userId") { value(memberUser.id) }
            jsonPath("$.participants[0].targetCount") { value(3) }
            jsonPath("$.participants[0].completedCount") { value(2) }
        }
    }

    @Test
    @DisplayName("트리거 API: /result/aggregate 호출 시 결과 생성 및 200 반환")
    fun testTriggerAggregateEndpoint() {
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/result/aggregate") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.challengeId") { value(challenge.id) }
            jsonPath("$.status") { value("CONFIRMED") }
        }
    }

    @Test
    @DisplayName("배치/스케줄러: processEndedChallenges 실행 시 종료된 챌린지가 일괄 집계됨")
    fun testProcessEndedChallenges() {
        val now = LocalDateTime.of(2026, 10, 4, 10, 0)
        val processed = challengeResultService.processEndedChallenges(now)
        org.assertj.core.api.Assertions.assertThat(processed).isGreaterThanOrEqualTo(1)
    }
}
