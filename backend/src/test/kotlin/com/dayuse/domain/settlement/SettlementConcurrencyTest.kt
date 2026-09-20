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
import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.Future
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
        hostUser = userRepository.save(
            User(
                kakaoId = "concur_host",
                nickname = "동시성모임장"
            )
        )
        memberUser = userRepository.save(
            User(
                kakaoId = "concur_member",
                nickname = "동시성모임원"
            )
        )

        group = groupRepository.save(
            Group(
                name = "동시성 정산 모임",
                hostUserId = hostUser.id,
                inviteCode = "INVITE-CONCUR"
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = hostUser.id,
                role = GroupRole.HOST
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = memberUser.id,
                role = GroupRole.MEMBER
            )
        )

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
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = memberUser.id,
                penaltyAmount = 5000
            )
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
        val threadCount = 2
        val executor = Executors.newFixedThreadPool(threadCount)
        val readyLatch = CountDownLatch(threadCount)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(threadCount)

        val successCount = AtomicInteger(0)
        val failCount = AtomicInteger(0)

        val request = CreateDepositReportRequest(
            depositorName = "동시성입금자",
            depositDate = today,
            totalAmount = 10000,
            dailyRecordIds = listOf(
                record1.id,
                record2.id
            )
        )

        val tasks = mutableListOf<Future<*>>()
        try {
            repeat(threadCount) {
                tasks += executor.submit {
                    readyLatch.countDown()
                    try {
                        startLatch.await()
                        settlementService.createDepositReport(
                            group.id,
                            memberUser.id,
                            request
                        )
                        successCount.incrementAndGet()
                    } catch (e: BadRequestException) {
                        assertEquals(
                            "이미 입금 확인 대기 중이거나 완료된 기록이 포함되어 있습니다.",
                            e.message,
                            "실패한 요청은 중복 입금 신고로 거절되어야 합니다."
                        )
                        failCount.incrementAndGet()
                    } finally {
                        doneLatch.countDown()
                    }
                }
            }

            assertTrue(
                readyLatch.await(5, TimeUnit.SECONDS),
                "두 작업이 제한 시간 안에 준비되지 않았습니다."
            )
            startLatch.countDown()
            assertTrue(
                doneLatch.await(10, TimeUnit.SECONDS),
                "두 입금 신고 작업이 제한 시간 안에 끝나지 않았습니다."
            )
            // 작업 스레드의 예상 밖 예외와 assertion 실패도 테스트 실패로 전달한다.
            tasks.forEach { it.get(1, TimeUnit.SECONDS) }
        } finally {
            // 준비/완료 대기나 검증이 실패해도 남은 작업을 취소하고 종료를 기다린다.
            tasks.forEach { it.cancel(true) }
            executor.shutdownNow()
            assertTrue(
                executor.awaitTermination(10, TimeUnit.SECONDS),
                "작업 취소 후에도 Executor가 종료되지 않았습니다."
            )
        }

        // 검증 1: 1개만 성공하고 1개는 차단됨
        assertEquals(
            1,
            successCount.get(),
            "동시 입금 신고 시 정확히 1개의 요청만 성공해야 합니다."
        )
        assertEquals(
            1,
            failCount.get(),
            "동시 입금 신고 시 중복된 요청은 예외가 발생하여 차단되어야 합니다."
        )

        // 검증 2: 생성된 입금 신고 엔티티는 정확히 1건이어야 함
        val reports = depositReportRepository.findAllByGroupIdOrderByCreatedAtDesc(group.id)
        assertEquals(
            1,
            reports.size
        )
        assertEquals(
            DepositReportStatus.WAITING_CONFIRMATION,
            reports[0].status
        )

        // 검증 3: DailyRecord 상태는 WAITING_CONFIRMATION이어야 함
        val r1 = dailyRecordRepository.findById(record1.id).get()
        val r2 = dailyRecordRepository.findById(record2.id).get()
        assertEquals(
            DepositStatus.WAITING_CONFIRMATION,
            r1.depositStatus
        )
        assertEquals(
            DepositStatus.WAITING_CONFIRMATION,
            r2.depositStatus
        )

        // 검증 4: 감사 로그도 REPORTED 1건만 존재해야 함
        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(reports[0].id)
        assertEquals(
            1,
            auditLogs.size
        )
        assertEquals(
            DepositAuditAction.REPORTED,
            auditLogs[0].action
        )
    }
}
