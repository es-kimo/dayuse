@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.settlement

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@ActiveProfiles("test")
class SettlementConcurrencyTest {

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
    private lateinit var groupAccountRepository: GroupAccountRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    @Autowired
    private lateinit var depositReportItemRepository: DepositReportItemRepository

    @Autowired
    private lateinit var depositAuditLogRepository: DepositAuditLogRepository

    @Autowired
    private lateinit var settlementService: SettlementService

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var record1: DailyRecord
    private lateinit var record2: DailyRecord

    private val today: LocalDate = LocalDate.now()

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "concur_host", nickname = "동시성모임장"))
        memberUser = userRepository.save(User(kakaoId = "concur_member", nickname = "동시성모임원"))

        group = groupRepository.save(Group(name = "동시성 정산 모임", hostUserId = hostUser.id, inviteCode = "INVITE-CONCUR"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))

        groupAccountRepository.save(
            GroupAccount(
                groupId = group.id,
                bankName = "카카오뱅크",
                accountNumber = "3333-00-1111111",
                accountHolder = "동시성모임장"
            )
        )

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "동시성 챌린지",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(5),
                endDate = today.plusDays(5)
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser.id, penaltyAmount = 5000)
        )

        record1 = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today.minusDays(2),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
        record2 = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
    }

    @AfterEach
    fun tearDown() {
        depositAuditLogRepository.deleteAll()
        depositReportItemRepository.deleteAll()
        depositReportRepository.deleteAll()
        groupAccountRepository.deleteAll()
        dailyRecordRepository.deleteAll()
        challengeParticipantRepository.deleteAll()
        challengeRepository.deleteAll()
        groupMemberRepository.deleteAll()
        groupRepository.deleteAll()
        userRepository.deleteAll()
    }

    @Test
    fun `동일한 미납 기록들에 대해 2개의 스레드가 동시에 입금 신고를 시도할 때 비관적 락으로 1건만 성공하고 중복 처리가 방어된다`() {
        // TODO [사용자 미션 5-3]: 멀티스레드 환경에서 동일한 미납 기록들에 대한 동시 입금 신고 충돌을 방어하는 동시성 테스트를 작성해 보세요.
        // 🎓 핵심 질문: 멀티스레드(ExecutorService, CountDownLatch) 테스트를 어떻게 구성해야 두 트랜잭션이 정확히 동시에 경합하도록 만들 수 있을까요?
        // 
        // 요구사항:
        // 1. threadCount = 2, ExecutorService, readyLatch, startLatch, doneLatch를 준비합니다.
        // 2. AtomicInteger로 successCount와 failCount를 측정합니다.
        // 3. 두 스레드가 동일한 미납 기록(record1.id, record2.id)에 대해 동시에 settlementService.createDepositReport()를 호출하도록 스케줄링합니다.
        // 4. startLatch.countDown()으로 두 스레드를 동시에 출발시키고 doneLatch.await()로 완료를 대기합니다.
        // 5. 비관적 락에 의해 1개 요청만 성공(successCount == 1), 1개 요청은 예외 발생 차단(failCount == 1)되었는지 검증합니다.
        // 6. DB에 생성된 DepositReport가 1건(WAITING_CONFIRMATION)이고, DailyRecord의 depositStatus가 WAITING_CONFIRMATION인지 검증합니다.
        // 7. 감사 로그(DepositAuditLog)도 REPORTED 액션으로 1건만 존재하는지 검증합니다.
        org.junit.jupiter.api.Assertions.fail<Unit>("사용자 미션 5-3을 구현해 보세요.")
    }
}
