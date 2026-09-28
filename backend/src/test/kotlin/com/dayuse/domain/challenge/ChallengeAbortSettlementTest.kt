@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.AbortChallengeRequest
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.period.ChallengePeriodSettlement
import com.dayuse.domain.challenge.period.ChallengePeriodSettlementRepository
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
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

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChallengeAbortSettlementTest {

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var dailyRecordService: DailyRecordService

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var challengePeriodSettlementRepository: ChallengePeriodSettlementRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    private lateinit var creatorUser: User
    private lateinit var participantUser: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        creatorUser = userRepository.save(User(kakaoId = "kakao_c", nickname = "생성자"))
        participantUser = userRepository.save(User(kakaoId = "kakao_p", nickname = "참가자"))

        group = groupRepository.save(Group(name = "정산 테스트 모임", hostUserId = creatorUser.id, inviteCode = "ABORT_SETTLE_1"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = creatorUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = participantUser.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `매일 챌린지 중단 시 중단 당일 미인증은 미수행 정산 및 미확인 목록에서 제외되고 과거 FAILED는 보존된다`() {
        val today = DateTimeUtils.todayKst()
        val startDate = today.minusDays(3)
        val endDate = today.plusDays(10)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "매일 챌린지",
                verificationCriteria = "인증 기준",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.DAILY
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = participantUser.id,
                penaltyAmount = 5000,
                startDate = startDate
            )
        )

        // 3일 전: COMPLETED
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today.minusDays(3),
                status = DailyRecordStatus.COMPLETED,
                verificationId = 100L
            )
        )
        // 2일 전: FAILED (과거 마감 기간 확정 벌금 5000원)
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today.minusDays(2),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
        // 1일 전: UNCHECKED (과거 마감 기간 미확인)
        val recordYesterday = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.UNCHECKED
            )
        )
        // 오늘(중단 당일): WAITING (진행 중 열린 기간)
        val recordToday = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today,
                status = DailyRecordStatus.WAITING
            )
        )

        // 챌린지 중단 실행 (오늘 날짜)
        challengeService.abortChallenge(challenge.id, creatorUser.id, AbortChallengeRequest(reason = "사유"))

        // 1. 과거 2일 전 FAILED 벌금 5000원은 그대로 보존되어야 함
        val unpaidAmount = dailyRecordRepository.calculateUnpaidPenaltyAmount(participantUser.id, group.id)
        assertEquals(5000, unpaidAmount)

        // 2. 과거 1일 전 UNCHECKED는 마감된 기간이므로 미확인 목록에 포함되어야 함
        val unchecked = dailyRecordRepository.findUncheckedRecords(participantUser.id, group.id, today)
        assertEquals(1, unchecked.size)
        assertEquals(recordYesterday.id, unchecked[0].id)

        // 3. 중단 당일(오늘) 및 이후의 기록은 markFailed로 미수행 확정할 수 없음
        assertThrows(BadRequestException::class.java) {
            dailyRecordService.markFailed(recordToday.id, participantUser.id)
        }
    }

    @Test
    fun `매일 챌린지 중단 시 당일 기등록된 인증은 완료로 보존되고 달성률 분모에서 당일 및 미래는 제외된다`() {
        val today = DateTimeUtils.todayKst()
        val startDate = today.minusDays(2)
        val endDate = today.plusDays(4)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "매일 챌린지",
                verificationCriteria = "인증 기준",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.DAILY
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = participantUser.id,
                penaltyAmount = 5000,
                startDate = startDate
            )
        )

        // startDate (-2일): 인증 완료
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = startDate,
                status = DailyRecordStatus.COMPLETED,
                verificationId = 1L
            )
        )
        // -1일: 미인증 (UNCHECKED)
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.UNCHECKED
            )
        )
        // 오늘(중단 당일): 이미 인증 완료
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today,
                status = DailyRecordStatus.COMPLETED,
                verificationId = 2L
            )
        )

        // 챌린지 중단 실행
        challengeService.abortChallenge(challenge.id, creatorUser.id, AbortChallengeRequest(reason = "중단"))

        // 달성률 계산 검증:
        // 기 마감 기간: -2일, -1일 (총 2일) -> totalTargetCount = 2
        // 실제 인증 수: -2일 1회 + 오늘 1회 = 2회 -> totalCompletedCount = 2
        // 달성률 = 2 / 2 = 100%
        val detail = challengeService.getChallengeDetail(challenge.id, participantUser.id, today)
        assertEquals(2, detail.totalTargetCount)
        assertEquals(2, detail.totalCompletedCount)
        assertEquals(100, detail.progressRate)
    }

    @Test
    fun `주 N회 챌린지 중단 시 진행 중 주기는 EXCLUDED_ABORTED로 처리되고 미수행 확정이 차단된다`() {
        val today = DateTimeUtils.todayKst()
        val startDate = today.minusDays(10)
        val endDate = today.plusDays(10)

        // 7일씩: 1주기 (startDate ~ startDate+6일), 2주기 (startDate+7일 ~ startDate+13일) -> today는 2주기 내에 있음
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "주 3회 챌린지",
                verificationCriteria = "인증 기준",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = participantUser.id,
                penaltyAmount = 5000,
                startDate = startDate
            )
        )

        // 1구간 (마감됨): 이미 확정된 미수행 (벌금 5000원)
        challengePeriodSettlementRepository.save(
            ChallengePeriodSettlement(
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                groupId = group.id,
                periodIndex = 1,
                startDate = startDate,
                endDate = startDate.plusDays(6),
                targetCount = 3,
                completedCount = 2,
                missedCount = 1,
                penaltyAmountPerMiss = 5000,
                totalPenaltyAmount = 5000,
                status = PeriodSettlementStatus.CONFIRMED_FAILED,
                depositStatus = DepositStatus.UNPAID
            )
        )

        // 1구간 인증 2건 등록
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = startDate,
                status = DailyRecordStatus.COMPLETED,
                verificationId = 101L
            )
        )
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = startDate.plusDays(1),
                status = DailyRecordStatus.COMPLETED,
                verificationId = 102L
            )
        )

        // 2구간 (진행 중): 오늘까지 1회 인증 완료
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = participantUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.COMPLETED,
                verificationId = 200L
            )
        )

        // 챌린지 중단 실행
        challengeService.abortChallenge(challenge.id, creatorUser.id, AbortChallengeRequest(reason = "중단"))

        val detail = challengeService.getChallengeDetail(challenge.id, participantUser.id, today)
        val intervals = detail.intervals!!

        // 1구간은 기존 CONFIRMED_FAILED 보존
        assertEquals(PeriodSettlementStatus.CONFIRMED_FAILED, intervals[0].settlementStatus)
        assertEquals(5000, intervals[0].totalPenaltyAmount)

        // 2구간(진행 중이던 주기)은 EXCLUDED_ABORTED 처리 및 벌금 0원
        assertEquals(PeriodSettlementStatus.EXCLUDED_ABORTED, intervals[1].settlementStatus)
        assertEquals(0, intervals[1].totalPenaltyAmount)

        // 2구간에 대해 confirmPeriod 호출 시 차단되어야 함
        assertThrows(BadRequestException::class.java) {
            challengeService.confirmPeriod(group.id, challenge.id, 2, participantUser.id)
        }

        // 달성률: 1구간(target=3)만 분모에 포함, 분자는 1구간(2) + 2구간(1) = 3 -> 100%
        assertEquals(3, detail.totalTargetCount)
        assertEquals(3, detail.totalCompletedCount)
        assertEquals(100, detail.progressRate)
    }

    @Test
    fun `시작 전에 중단된 챌린지는 분모가 0이고 달성률 0퍼센트이며 어떠한 벌금도 발생하지 않는다`() {
        val today = DateTimeUtils.todayKst()
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creatorUser.id,
                title = "미래 챌린지",
                verificationCriteria = "인증",
                startDate = today.plusDays(2),
                endDate = today.plusDays(15),
                periodType = PeriodType.DAILY
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = participantUser.id, startDate = today.plusDays(2))
        )

        challengeService.abortChallenge(challenge.id, creatorUser.id, AbortChallengeRequest(reason = "시작 전 취소"))

        val detail = challengeService.getChallengeDetail(challenge.id, participantUser.id, today)
        assertEquals(0, detail.totalTargetCount)
        assertEquals(0, detail.totalCompletedCount)
        assertEquals(0, detail.progressRate)
    }
}
