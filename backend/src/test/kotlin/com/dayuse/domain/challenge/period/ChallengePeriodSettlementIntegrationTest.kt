@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge.period

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.service.NotificationSchedulerService
import com.dayuse.domain.settlement.DepositReportRepository
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.today.service.TodayService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChallengePeriodSettlementIntegrationTest {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var settlementService: SettlementService

    @Autowired
    private lateinit var todayService: TodayService

    @Autowired
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var challengePeriodSettlementRepository: ChallengePeriodSettlementRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    private var hostUserId: Long = 0L
    private var memberUserId: Long = 0L
    private var otherUserId: Long = 0L
    private var groupId: Long = 0L

    @BeforeEach
    fun setUp() {
        val hostUser = userRepository.save(User(kakaoId = "8801", nickname = "방장", profileImageUrl = null))
        hostUserId = hostUser.id

        val memberUser = userRepository.save(User(kakaoId = "8802", nickname = "멤버", profileImageUrl = null))
        memberUserId = memberUser.id

        val otherUser = userRepository.save(User(kakaoId = "8803", nickname = "외부인", profileImageUrl = null))
        otherUserId = otherUser.id

        val group = groupRepository.save(
            Group(
                name = "주기 챌린지 테스트 모임",
                hostUserId = hostUserId,
                inviteCode = "INVITE88"
            )
        )
        groupId = group.id

        groupMemberRepository.save(GroupMember(groupId = groupId, userId = hostUserId, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = groupId, userId = memberUserId, role = GroupRole.MEMBER))

        // 모임 계좌 등록
        settlementService.updateGroupAccount(
            groupId = groupId,
            userId = hostUserId,
            request = com.dayuse.domain.settlement.dto.GroupAccountRequest(
                bankName = "카카오뱅크",
                accountNumber = "3333-01-1234567",
                accountHolder = "방장"
            )
        )
    }

    @Test
    fun `주 N회 구간 종료 후 목표 미달 시 NEEDS_CONFIRMATION 상태가 되고 본인이 미수행 확정할 수 있다`() {
        val startDate = LocalDate.of(2026, 9, 1)
        val endDate = LocalDate.of(2026, 9, 14) // 1구간: 9/1~9/7, 2구간: 9/8~9/14

        val challenge = challengeService.createChallenge(
            groupId = groupId,
            userId = hostUserId,
            request = CreateChallengeRequest(
                title = "주 3회 러닝",
                verificationCriteria = "3km 달리기",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUserId, penaltyAmount = 6000)
                )
            ),
            today = startDate
        )

        // 멤버가 1구간(9/1~9/7) 중 9월 2일에 1회만 인증함 (목표 3회 중 1회만 달성 -> 2회 미달)
        val v = verificationRepository.save(
            Verification(
                groupId = groupId,
                challengeId = challenge.id,
                userId = memberUserId,
                targetDate = LocalDate.of(2026, 9, 2),
                imageUrl = "running.jpg"
            )
        )
        val memberRecord = dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUserId && it.date == LocalDate.of(2026, 9, 2) }
        memberRecord.verifyToday(v.id)

        // 기준일: 9월 8일 (1구간 종료 직후)
        val today = LocalDate.of(2026, 9, 8)

        // 1. 상세 조회 시 1구간 상태 확인
        val detail = challengeService.getChallengeDetail(challenge.id, memberUserId, today)
        assertNotNull(detail.intervals)
        val period1 = detail.intervals!!.find { it.index == 1 }!!
        assertEquals(3, period1.targetCount)
        assertEquals(1, period1.completedCount)
        assertEquals(PeriodSettlementStatus.NEEDS_CONFIRMATION, period1.settlementStatus)
        assertEquals(2, period1.missedCount)
        assertEquals(12000, period1.totalPenaltyAmount) // 2회 * 6,000원

        // 2. 타인이 확정 시도 시 403 Forbidden
        assertThrows<ForbiddenException> {
            challengeService.confirmPeriod(groupId, challenge.id, 1, otherUserId, today)
        }

        // 3. 본인이 확정 API 호출 성공
        val confirmed = challengeService.confirmPeriod(groupId, challenge.id, 1, memberUserId, today)
        assertEquals(1, confirmed.periodIndex)
        assertEquals(PeriodSettlementStatus.CONFIRMED_FAILED, confirmed.status)
        assertEquals(2, confirmed.missedCount)
        assertEquals(6000, confirmed.penaltyAmountPerMiss)
        assertEquals(12000, confirmed.totalPenaltyAmount)

        // 4. 멱등성 검증: 다시 호출해도 중복 부과 없이 동일 응답 반환
        val reconfirmed = challengeService.confirmPeriod(groupId, challenge.id, 1, memberUserId, today)
        assertEquals(confirmed.totalPenaltyAmount, reconfirmed.totalPenaltyAmount)
        assertEquals(PeriodSettlementStatus.CONFIRMED_FAILED, reconfirmed.status)

        // 5. 진행 중인 2구간(9/8~9/14) 확정 시도 시 예외 발생
        assertThrows<BadRequestException> {
            challengeService.confirmPeriod(groupId, challenge.id, 2, memberUserId, today)
        }
    }

    @Test
    fun `주 N회 확정 벌금은 기존 입금 신고 및 호스트 승인 파이프라인과 완벽히 연동된다`() {
        val startDate = LocalDate.of(2026, 9, 1)
        val endDate = LocalDate.of(2026, 9, 14)

        val challenge = challengeService.createChallenge(
            groupId = groupId,
            userId = hostUserId,
            request = CreateChallengeRequest(
                title = "주 2회 수영",
                verificationCriteria = "수영 500m",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 2,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUserId, penaltyAmount = 10000)
                )
            ),
            today = startDate
        )

        val today = LocalDate.of(2026, 9, 8)
        // 1구간 미인증 상태에서 확정 -> 2회 미수행 = 20,000원 벌금
        val period1Confirm = challengeService.confirmPeriod(groupId, challenge.id, 1, memberUserId, today)
        assertEquals(20000, period1Confirm.totalPenaltyAmount)

        // 1. 미납 벌금 조회 (getUnpaidRecords) 시 주간 정산 건이 포함되어야 함
        val unpaidItems = settlementService.getUnpaidRecords(groupId, memberUserId)
        assertEquals(1, unpaidItems.size)
        val unpaidPeriod = unpaidItems[0]
        assertTrue(unpaidPeriod.isPeriod)
        assertEquals(1, unpaidPeriod.periodIndex)
        assertEquals(20000, unpaidPeriod.penaltyAmount)

        // 2. 입금 신고 생성
        val report = settlementService.createDepositReport(
            groupId = groupId,
            userId = memberUserId,
            request = CreateDepositReportRequest(
                depositorName = "홍길동",
                depositDate = today,
                totalAmount = 20000,
                periodSettlementIds = listOf(unpaidPeriod.id)
            )
        )
        assertEquals(20000, report.totalAmount)
        assertEquals(1, report.items.size)
        assertTrue(report.items[0].isPeriod)

        val savedSettlement = challengePeriodSettlementRepository.findById(unpaidPeriod.id).get()
        assertEquals(DepositStatus.WAITING_CONFIRMATION, savedSettlement.depositStatus)

        // 3. 호스트가 승인 처리
        val confirmedReport = settlementService.confirmDepositReport(report.id, hostUserId)
        assertEquals(com.dayuse.domain.settlement.DepositReportStatus.CONFIRMED, confirmedReport.status)

        val approvedSettlement = challengePeriodSettlementRepository.findById(unpaidPeriod.id).get()
        assertEquals(DepositStatus.CONFIRMED, approvedSettlement.depositStatus)

        // 4. 승인 후 미납 건수는 0건이어야 함
        val unpaidAfter = settlementService.getUnpaidRecords(groupId, memberUserId)
        assertTrue(unpaidAfter.isEmpty())
    }

    @Test
    fun `주 N회 오늘 할 일 조회 및 웹 푸시 스케줄러가 잔여 목표와 당일 인증 여부를 정확히 판정한다`() {
        val startDate = LocalDate.of(2026, 9, 1)
        val endDate = LocalDate.of(2026, 9, 14)

        val challenge = challengeService.createChallenge(
            groupId = groupId,
            userId = hostUserId,
            request = CreateChallengeRequest(
                title = "주 2회 독서",
                verificationCriteria = "30분 독서",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 2,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUserId, penaltyAmount = 5000)
                )
            ),
            today = startDate
        )

        val today = LocalDate.of(2026, 9, 2)

        // 1. 단건 오늘 할 일 API 조회 (GET .../today-todo)
        val todo = todayService.getChallengeTodayTodo(groupId, challenge.id, memberUserId, today)
        assertEquals(PeriodType.WEEKLY_N, todo.periodType)
        assertNotNull(todo.periodInfo)
        assertEquals(1, todo.periodInfo!!.index)
        assertEquals(2, todo.periodInfo!!.targetCount)
        assertEquals(0, todo.periodInfo!!.completedCount)
        assertFalse(todo.periodInfo!!.todayVerified)
        assertFalse(todo.periodInfo!!.isGoalAchieved)

        // 2. 알림 스케줄러: 당일 미인증 & 목표 미달 -> 알림 대상 (pendingCount = 1)
        val pending1 = notificationSchedulerService.countPendingChallenges(memberUserId, today)
        assertEquals(1, pending1)

        // 3. 당일 인증 완료 -> 당일 알림 대상 제외 (pendingCount = 0)
        val v1 = verificationRepository.save(
            Verification(
                groupId = groupId,
                challengeId = challenge.id,
                userId = memberUserId,
                targetDate = today,
                imageUrl = "book1.jpg"
            )
        )
        val recordToday = dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUserId && it.date == today }
        recordToday.verifyToday(v1.id)

        val pending2 = notificationSchedulerService.countPendingChallenges(memberUserId, today)
        assertEquals(0, pending2)

        // 4. 다음날(9월 3일): 당일 미인증이지만 목표 2회 중 1회만 완료했으므로 알림 대상 (pendingCount = 1)
        val nextDay = LocalDate.of(2026, 9, 3)
        val pendingNext = notificationSchedulerService.countPendingChallenges(memberUserId, nextDay)
        assertEquals(1, pendingNext)

        // 5. 9월 3일에 두 번째 인증 완료 -> 이번 구간 목표(2회) 달성 완료!
        val v2 = verificationRepository.save(
            Verification(
                groupId = groupId,
                challengeId = challenge.id,
                userId = memberUserId,
                targetDate = nextDay,
                imageUrl = "book2.jpg"
            )
        )
        val recordNext = dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUserId && it.date == nextDay }
        recordNext.verifyToday(v2.id)

        // 6. 다다음날(9월 4일): 당일 미인증이지만 이미 이번 구간 목표(2회)를 달성했으므로 알림 발송 제외 (pendingCount = 0)
        val dayAfter = LocalDate.of(2026, 9, 4)
        val pendingAfterGoalAchieved = notificationSchedulerService.countPendingChallenges(memberUserId, dayAfter)
        assertEquals(0, pendingAfterGoalAchieved)
    }
}
