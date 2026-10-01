@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.dailyrecord

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
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
import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 모임 홈용 "지금 리데이 가능한 내 기록" 목록 조회 검증 (v0.11 F11)
 *
 * 이 목록은 모임 홈에 진입 버튼을 띄우는 근거이므로, 단건 적격 판정과 결과가 어긋나면
 * 눌렀을 때 서버가 거절하는 버튼이 생긴다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RedayCandidateQueryTest {

    @Autowired private lateinit var userRepository: UserRepository
    @Autowired private lateinit var groupRepository: GroupRepository
    @Autowired private lateinit var groupMemberRepository: GroupMemberRepository
    @Autowired private lateinit var challengeRepository: ChallengeRepository
    @Autowired private lateinit var challengeParticipantRepository: ChallengeParticipantRepository
    @Autowired private lateinit var dailyRecordRepository: DailyRecordRepository
    @Autowired private lateinit var verificationRepository: VerificationRepository
    @Autowired private lateinit var dailyRecordService: DailyRecordService

    private lateinit var owner: User
    private lateinit var stranger: User
    private lateinit var group: Group

    private val targetDate = LocalDate.of(2026, 10, 1)
    /** 대상일 익일 09:00 이후 = 리데이 가능 구간, 기한은 10/03 09:00 */
    private val now = LocalDateTime.of(2026, 10, 2, 14, 0)

    @BeforeEach
    fun setUp() {
        owner = userRepository.save(User(kakaoId = "cand_owner_${System.nanoTime()}", nickname = "본인"))
        stranger = userRepository.save(User(kakaoId = "cand_stranger_${System.nanoTime()}", nickname = "외부인"))

        group = groupRepository.save(
            Group(
                name = "리데이 후보 모임",
                hostUserId = owner.id,
                inviteCode = "CAND${System.nanoTime().toString().takeLast(6)}"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = owner.id, role = GroupRole.HOST))
    }

    private fun createChallenge(
        title: String,
        periodType: PeriodType = PeriodType.DAILY,
        executionType: ExecutionType = ExecutionType.INDIVIDUAL,
        redayAllowed: Boolean = true
    ): Challenge = challengeRepository.save(
        Challenge(
            groupId = group.id,
            creatorUserId = owner.id,
            title = title,
            verificationCriteria = "사진",
            startDate = targetDate.minusDays(5),
            endDate = targetDate.plusDays(5),
            periodType = periodType,
            // 주 N회 챌린지는 목표 횟수가 필수다.
            targetFrequency = if (periodType == PeriodType.WEEKLY_N) 3 else null,
            executionType = executionType,
            redayAllowed = redayAllowed
        )
    )

    private fun createLateRecord(
        challenge: Challenge,
        userId: Long = owner.id,
        penaltyAmount: Int = 3000,
        date: LocalDate = targetDate
    ): DailyRecord {
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = userId,
                penaltyAmount = penaltyAmount,
                startDate = challenge.startDate
            )
        )
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userId,
                targetDate = date,
                imageUrl = "verifications/${challenge.id}/$userId/late.png",
                isLate = true
            )
        )
        val record = DailyRecord(
            groupId = group.id,
            challengeId = challenge.id,
            challengeParticipantId = participant.id,
            userId = userId,
            date = date,
            status = DailyRecordStatus.UNCHECKED
        )
        record.verifyLate(
            verificationId = verification.id,
            isLate = true,
            today = date.plusDays(1),
            redayAllowed = challenge.isRedayActive() && penaltyAmount > 0,
            penaltyAmountForOverdue = penaltyAmount,
            submittedAt = now
        )
        return dailyRecordRepository.save(record)
    }

    @Test
    fun `리데이 가능 구간의 지각 인증 기록을 기한이 임박한 순서로 돌려준다`() {
        val soonChallenge = createChallenge("빠른 기한")
        val laterChallenge = createChallenge("늦은 기한")
        val soonRecord = createLateRecord(soonChallenge, date = targetDate)
        val laterRecord = createLateRecord(laterChallenge, date = targetDate.plusDays(1))

        val candidates = dailyRecordService.getRedayCandidates(group.id, owner.id, now)

        assertEquals(listOf(soonRecord.id, laterRecord.id), candidates.map { it.recordId })
        assertEquals("빠른 기한", candidates[0].challengeTitle)
        assertEquals(3000, candidates[0].penaltyAmount)
        assertEquals(PenaltyStatus.PENDING, candidates[0].penaltyStatus)
        assertTrue(candidates[0].remainingSeconds > 0)
    }

    @Test
    fun `주 N회와 함께하기와 리데이 미허용 챌린지 기록은 목록에서 제외한다`() {
        /*
         * 주 N회·함께하기 챌린지는 Challenge 엔티티가 redayAllowed=true 자체를 거부하므로
         * 여기서도 실제로 존재할 수 있는 상태(redayAllowed=false)로만 만든다.
         * 판정기(evaluateRedayEligibilityInternal)의 WEEKLY_NOT_SUPPORTED·TOGETHER_NOT_SUPPORTED
         * 분기는 이 불변식이 깨졌을 때를 대비한 2차 방어다.
         */
        createLateRecord(createChallenge("주N회", periodType = PeriodType.WEEKLY_N, redayAllowed = false))
        createLateRecord(createChallenge("함께하기", executionType = ExecutionType.TOGETHER, redayAllowed = false))
        createLateRecord(createChallenge("리데이 미허용", redayAllowed = false))

        val candidates = dailyRecordService.getRedayCandidates(group.id, owner.id, now)

        assertTrue(candidates.isEmpty(), "제외 대상만 있으면 빈 목록이어야 합니다: $candidates")
    }

    @Test
    fun `기한이 지난 기록과 이미 리데이를 적용한 기록은 목록에서 제외한다`() {
        val expiredChallenge = createChallenge("기한 만료")
        createLateRecord(expiredChallenge)
        val appliedChallenge = createChallenge("이미 적용")
        val appliedRecord = createLateRecord(appliedChallenge)
        appliedRecord.applyReday(now)

        // 대상일 이틀 뒤 09:00 이후 = 기한 만료
        val afterDeadline = targetDate.plusDays(2).atTime(9, 1)
        assertTrue(dailyRecordService.getRedayCandidates(group.id, owner.id, afterDeadline).isEmpty())

        // 기한 내라도 이미 적용된 기록은 빠진다
        val stillInWindow = dailyRecordService.getRedayCandidates(group.id, owner.id, now)
        assertTrue(stillInWindow.none { it.recordId == appliedRecord.id })
    }

    @Test
    fun `약정 벌금이 없는 기록은 목록에서 제외한다`() {
        createLateRecord(createChallenge("벌금 없음"), penaltyAmount = 0)

        assertTrue(dailyRecordService.getRedayCandidates(group.id, owner.id, now).isEmpty())
    }

    @Test
    fun `모임 멤버가 아니면 403으로 차단하고 타인 기록은 돌려주지 않는다`() {
        val challenge = createChallenge("본인 기록")
        createLateRecord(challenge)

        assertThrows(ForbiddenException::class.java) {
            dailyRecordService.getRedayCandidates(group.id, stranger.id, now)
        }

        // 멤버로 넣어도 타인(본인 아님) 기록은 보이지 않는다
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = stranger.id, role = GroupRole.MEMBER))
        assertTrue(dailyRecordService.getRedayCandidates(group.id, stranger.id, now).isEmpty())
    }
}
