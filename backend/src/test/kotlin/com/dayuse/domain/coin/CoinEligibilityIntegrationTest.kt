@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.coin

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.ChallengeResult
import com.dayuse.domain.challenge.result.ChallengeResultRepository
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.domain.coin.service.CoinEligibilityService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("test")
@Transactional
@DisplayName("코인 자격 및 발행 상한 서비스 통합 테스트 (CoinEligibilityIntegrationTest)")
class CoinEligibilityIntegrationTest {

    @Autowired
    private lateinit var coinEligibilityService: CoinEligibilityService

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
    private lateinit var challengeResultRepository: ChallengeResultRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    private lateinit var user1: User
    private lateinit var user2: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        user1 = userRepository.save(
            User(
                kakaoId = "kakao-test-1",
                nickname = "사용자1",
                profileImageUrl = null
            )
        )
        user2 = userRepository.save(
            User(
                kakaoId = "kakao-test-2",
                nickname = "사용자2",
                profileImageUrl = null
            )
        )

        group = groupRepository.save(
            Group(
                name = "테스트 모임",
                hostUserId = user1.id,
                inviteCode = "INVITE123"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user1.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user2.id, role = GroupRole.MEMBER))

        org.springframework.test.util.ReflectionTestUtils.setField(user1, "createdAt", LocalDateTime.of(2026, 9, 1, 0, 0))
        org.springframework.test.util.ReflectionTestUtils.setField(user2, "createdAt", LocalDateTime.of(2026, 9, 1, 0, 0))
    }

    @Test
    @DisplayName("정상 확정(CONFIRMED)된 각자하기 챌린지에서 유효 인증 날짜 수만큼 10코인이 산출된다")
    fun calculateForConfirmedIndividualChallenge() {
        val startDate = LocalDate.of(2026, 10, 1)
        val endDate = LocalDate.of(2026, 10, 5)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                title = "5일 챌린지",
                description = "매일 인증",
                startDate = startDate,
                endDate = endDate,
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY
            )
        )

        challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user1.id,
                startDate = startDate
            )
        )

        // 3일간 인증 등록
        listOf(startDate, startDate.plusDays(1), startDate.plusDays(2)).forEach { targetDate ->
            val v = verificationRepository.save(
                Verification(
                    groupId = group.id,
                    challengeId = challenge.id,
                    userId = user1.id,
                    targetDate = targetDate,
                    imageUrl = "https://example.com/img.jpg",
                    isLate = false
                )
            )
            org.springframework.test.util.ReflectionTestUtils.setField(v, "createdAt", targetDate.atTime(10, 0))
        }

        // CONFIRMED 상태 결과 저장
        challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = startDate,
                endDate = endDate
            )
        )

        val result = coinEligibilityService.calculateEligibilityForParticipant(
            challengeId = challenge.id,
            userId = user1.id,
            now = LocalDateTime.of(2026, 10, 7, 10, 0)
        )

        assertThat(result.awardedCoins).isEqualTo(30)
        assertThat(result.eligibleDates).hasSize(3)
    }

    @Test
    @DisplayName("함께하기 챌린지에서는 동일 날짜에 둘 다 인증했더라도 먼저 인증한 사용자만 코인 후보로 인정된다")
    fun calculateForTogetherChallengeFirstEarliestCredited() {
        val targetDate = LocalDate.of(2026, 10, 1)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                title = "함께하기 챌린지",
                description = "공동 목표",
                startDate = targetDate,
                endDate = targetDate,
                executionType = ExecutionType.TOGETHER,
                periodType = PeriodType.DAILY
            )
        )

        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge.id, userId = user1.id, startDate = targetDate))
        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge.id, userId = user2.id, startDate = targetDate))

        // user1이 먼저 인증, user2가 나중에 인증
        val v1 = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = user1.id,
                targetDate = targetDate,
                imageUrl = "https://example.com/1.jpg"
            )
        )
        org.springframework.test.util.ReflectionTestUtils.setField(v1, "createdAt", targetDate.atTime(10, 0))

        val v2 = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = user2.id,
                targetDate = targetDate,
                imageUrl = "https://example.com/2.jpg"
            )
        )
        org.springframework.test.util.ReflectionTestUtils.setField(v2, "createdAt", targetDate.atTime(11, 0))

        challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = targetDate,
                endDate = targetDate
            )
        )

        val allResults = coinEligibilityService.calculateEligibilityForAllParticipants(
            challengeId = challenge.id,
            now = LocalDateTime.of(2026, 10, 3, 10, 0)
        )

        assertThat(allResults[user1.id]?.awardedCoins).isEqualTo(10)
        assertThat(allResults[user2.id]?.awardedCoins).isEqualTo(0)
    }
}
