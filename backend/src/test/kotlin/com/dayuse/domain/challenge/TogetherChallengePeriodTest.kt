@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.ChallengePeriodIntervalDto
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.StartDateType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TogetherChallengePeriodTest {

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
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var dailyRecordService: DailyRecordService

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        userA = userRepository.save(User(kakaoId = "kakao_p_a", nickname = "주기테스트A"))
        userB = userRepository.save(User(kakaoId = "kakao_p_b", nickname = "주기테스트B"))

        group = groupRepository.save(
            Group(name = "주기 계산 테스트 모임", hostUserId = userA.id, inviteCode = "PERIOD-TEST-01")
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userA.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userB.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `F03-1 7일 단위 공동 주기 윈도우와 불완전 마지막 주기 비례 목표치가 정확히 계산된다`() {
        // 총 10일 기간의 주 5회 챌린지: 1구간(7일) 목표 5회, 2구간(3일) 목표 min(5, 3) = 3회
        val start = LocalDate.of(2026, 10, 1)
        val end = LocalDate.of(2026, 10, 10)
        val today = LocalDate.of(2026, 10, 5)

        val completedDates = setOf(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 3)
        )

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = start,
            challengeEndDate = end,
            participantStartDate = start,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 5,
            completedDates = completedDates,
            today = today,
            executionType = ExecutionType.TOGETHER
        )

        assertEquals(2, result.intervals.size, "10일은 7일 + 3일의 2개 구간이어야 합니다.")
        
        // 1구간 검증
        val first = result.intervals[0]
        assertEquals(1, first.index)
        assertEquals(LocalDate.of(2026, 10, 1), first.startDate)
        assertEquals(LocalDate.of(2026, 10, 7), first.endDate)
        assertEquals(5, first.targetCount)
        assertEquals(2, first.completedCount)
        assertFalse(first.isAchieved)

        // 2구간 (짧은 마지막 구간) 검증: min(5, 3) = 3
        val second = result.intervals[1]
        assertEquals(2, second.index)
        assertEquals(LocalDate.of(2026, 10, 8), second.startDate)
        assertEquals(LocalDate.of(2026, 10, 10), second.endDate)
        assertEquals(3, second.targetCount, "마지막 주기가 3일이므로 목표는 min(5, 3) = 3이어야 합니다.")
        assertEquals(0, second.completedCount)

        // 전체 목표 횟수 = 5 + 3 = 8회
        assertEquals(8, result.totalTargetCount)
        assertEquals(2, result.totalCompletedCount)
    }

    @Test
    fun `F03-2 중간 참여자는 별도 개인 주기 없이 기존 공동 진척에 합류하며 과거 기록은 소급되지 않는다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "주 3회 조깅",
                verificationCriteria = "조깅 인증",
                startDate = today.minusDays(3),
                endDate = today.plusDays(10), // 14일 챌린지
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3,
                executionType = ExecutionType.TOGETHER
            )
        )

        val participantA = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 0, startDate = challenge.startDate)
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participantA, challenge, today)

        // userA가 과거 2일간 인증을 올림 (공동 2/3 달성)
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = today.minusDays(2),
                imageUrl = "a1.jpg"
            )
        )
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = today.minusDays(1),
                imageUrl = "a2.jpg"
            )
        )

        // userB가 오늘 합류
        challengeService.joinChallenge(
            challengeId = challenge.id,
            userId = userB.id,
            request = JoinChallengeRequest(startDateType = StartDateType.TODAY),
            today = today
        )

        // userB 시점으로 상세 조회
        val detail = challengeService.getChallengeDetail(challenge.id, userB.id, today)
        
        // 검증: userB는 별도 1구간을 갖지 않고 기존 공동 구간(2/3 달성)에 그대로 합류
        val currentPeriod = detail.currentPeriod!!
        assertEquals(3, currentPeriod.targetCount)
        assertEquals(2, currentPeriod.completedCount, "기존 공동 달성치인 2회가 그대로 반영되어야 합니다.")

        // 검증: userB의 개인 달성률에는 과거 2일이 소급 적용되지 않음 (0%)
        val pB = detail.participants.find { it.userId == userB.id }!!
        assertEquals(0, pB.completionRate, "참여 전 과거 기록은 새 참가자의 개인 수행으로 소급되지 않습니다.")
    }

    @Test
    fun `F03-3 함께하기 챌린지에서는 구간 미달성 시에도 벌금이 0원이고 confirmPeriod 호출이 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "주 3회 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(10),
                endDate = today.plusDays(3),
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3,
                executionType = ExecutionType.TOGETHER
            )
        )

        val participantA = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 0, startDate = challenge.startDate)
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participantA, challenge, today)

        // 1구간(시작일~시작일+6)에 1건만 인증하여 목표 3회 미달성인 상태
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = challenge.startDate,
                imageUrl = "v1.jpg"
            )
        )

        val detail = challengeService.getChallengeDetail(challenge.id, userA.id, today)
        val firstInterval = detail.intervals!![0]

        // 검증: 구간 상태는 NOT_ACHIEVED(공동 미달성), 벌금은 0원
        assertEquals(PeriodSettlementStatus.NOT_ACHIEVED, firstInterval.settlementStatus)
        assertEquals(0, firstInterval.totalPenaltyAmount)
        assertEquals(0, firstInterval.penaltyAmountPerMiss)

        // 검증: confirmPeriod 호출 시 차단 (400 Bad Request)
        val exception = assertThrows(BadRequestException::class.java) {
            challengeService.confirmPeriod(
                groupId = group.id,
                challengeId = challenge.id,
                periodIndex = 1,
                userId = userA.id,
                today = today
            )
        }
        assertEquals("함께하기 챌린지는 벌금 확정을 진행하지 않습니다.", exception.message)
    }
}
