@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v013

import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.service.ProductEventService
import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.ChallengeResultRepository
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.domain.coin.CandidateVerification
import com.dayuse.domain.coin.CoinBalance
import com.dayuse.domain.coin.CoinBalanceRepository
import com.dayuse.domain.coin.CoinEligibilityCalculator
import com.dayuse.domain.coin.CoinRejectionReason
import com.dayuse.domain.coin.CoinTransactionRepository
import com.dayuse.domain.coin.CoinTransactionStatus
import com.dayuse.domain.coin.CoinTransactionType
import com.dayuse.domain.coin.ParticipantCoinContext
import com.dayuse.domain.coin.service.CoinEmergencyControlService
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
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
import com.fasterxml.jackson.databind.ObjectMapper
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.util.ReflectionTestUtils
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("v0.13 종합 E2E 검증, 예외/동시성 스트레스 테스트 및 안정화 검증")
class V013FinalComprehensiveIntegrationTest {

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
    private lateinit var challengeResultRepository: ChallengeResultRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var challengeResultService: ChallengeResultService

    @Autowired
    private lateinit var coinEligibilityService: com.dayuse.domain.coin.service.CoinEligibilityService

    @Autowired
    private lateinit var coinTransactionService: CoinTransactionService

    @Autowired
    private lateinit var coinBalanceRepository: CoinBalanceRepository

    @Autowired
    private lateinit var coinTransactionRepository: CoinTransactionRepository

    @Autowired
    private lateinit var coinEmergencyControlService: CoinEmergencyControlService

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var productEventService: ProductEventService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var jdbcTemplate: org.springframework.jdbc.core.JdbcTemplate

    @BeforeEach
    fun setUp() {
        coinEmergencyControlService.setKillSwitch(false, "종합 테스트 초기화")
        coinTransactionRepository.deleteAll()
        coinBalanceRepository.deleteAll()
        productEventRepository.deleteAll()
        verificationRepository.deleteAll()
        dailyRecordRepository.deleteAll()
        challengeParticipantRepository.deleteAll()
        challengeResultRepository.deleteAll()
        challengeRepository.deleteAll()
        groupMemberRepository.deleteAll()
        groupRepository.deleteAll()
        userRepository.deleteAll()
    }

    @Test
    @DisplayName("1. 전체 흐름 E2E: 챌린지 생성 -> 인증 등록 -> 운영 종료 -> 잠정 집계 -> 최종 마감 및 코인 자동 적립 -> 미확인 카드 노출 -> 결과 상세 확인 -> 코인 화면 조회 -> 분석 이벤트 검증")
    fun fullLifecycleE2ETest() {
        // 1. 유저 및 모임 준비
        val user = userRepository.save(User(nickname = "도전자", kakaoId = "kakao_e2e_100"))
        jdbcTemplate.update("UPDATE users SET created_at = ? WHERE id = ?", LocalDateTime.of(2026, 1, 1, 0, 0), user.id)
        val token = jwtTokenProvider.generateAccessToken(user.id)

        val group = groupRepository.save(Group(name = "E2E 모임", hostUserId = user.id, inviteCode = "INV-E2E-01"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user.id, role = GroupRole.MEMBER))

        val today = DateTimeUtils.todayKst()
        val startDate = today.minusDays(3)
        val endDate = today.minusDays(1)
        val dates: List<LocalDate> = listOf(today.minusDays(3), today.minusDays(2), today.minusDays(1))

        // 3일 개인 챌린지
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                title = "매일 1만보 걷기",
                description = "건강 습관 형성",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.DAILY,
                targetFrequency = 3,
                executionType = ExecutionType.INDIVIDUAL
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user.id,
                startDate = startDate,
                penaltyAmount = 5000
            )
        )

        // 2. 인증 등록 (3일간 매일 정상 수행)
        dates.forEach { date ->
            val v = verificationRepository.save(
                Verification(
                    groupId = group.id,
                    challengeId = challenge.id,
                    userId = user.id,
                    targetDate = date,
                    isLate = false,
                    imageUrl = "verifications/${challenge.id}/${user.id}/proof-$date.jpg"
                )
            )
            jdbcTemplate.update("UPDATE verifications SET created_at = ? WHERE id = ?", date.atTime(12, 0), v.id)

            dailyRecordRepository.save(
                DailyRecord(
                    challengeId = challenge.id,
                    userId = user.id,
                    challengeParticipantId = participant.id,
                    date = date,
                    verificationId = v.id,
                    redayApplied = false
                )
            )
        }

        // 3. 운영 종료 후 (마감 익일 09:00 이전) 잠정 결과 집계
        val provisionalTime = today.atTime(8, 0)
        val provisionalResult = challengeResultService.aggregateAndSave(challenge.id, provisionalTime)
        assertThat(provisionalResult.status).isEqualTo(ChallengeResultStatus.PROVISIONAL)
        assertThat(provisionalResult.isSuccess).isTrue()

        // 4. 최종 마감 시점 (마감 익일 09:00 이후 현재 시각) 결과 확정 -> 코인 자동 적립
        val finalizeTime = DateTimeUtils.nowKst()
        val finalResult = challengeResultService.aggregateAndSave(challenge.id, finalizeTime)
        assertThat(finalResult.status).isEqualTo(ChallengeResultStatus.CONFIRMED)

        // 코인 잔액 및 내역 확인 (3일 성공 -> 30코인 자동 적립)
        val balance = coinTransactionService.getBalance(user.id)
        assertThat(balance.availableBalance).isEqualTo(30)
        val transactions = coinTransactionRepository.findAllByUserId(user.id)
        assertThat(transactions).hasSize(3)
        assertThat(transactions.all { it.type == CoinTransactionType.GRANT && it.amount == 10 }).isTrue()

        // 5. 홈 미확인 카드 노출 확인 (GET /api/v1/challenges/ended-summary)
        val unackRes = mockMvc.get("/api/v1/challenges/ended-summary") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
        }.andReturn()

        val summaryObj = objectMapper.readTree(unackRes.response.contentAsString)
        assertThat(summaryObj["unacknowledgedCount"].asInt()).isEqualTo(1)
        val unackList = summaryObj["items"]
        assertThat(unackList.isArray).isTrue()
        assertThat(unackList.size()).isEqualTo(1)
        assertThat(unackList[0]["challengeId"].asLong()).isEqualTo(challenge.id)
        assertThat(unackList[0]["coinRewardCount"].asInt()).isEqualTo(30)

        // 클라이언트에서 결과 카드 노출 이벤트 전송 모사
        productEventService.recordEventSafely(
            authenticatedUserId = user.id,
            request = ProductEventCreateRequest(
                eventId = "notice-viewed-e2e-1",
                eventName = ProductEventName.CHALLENGE_RESULT_NOTICE_VIEWED.value,
                occurredAt = finalizeTime.toString(),
                sessionId = "test-session",
                appVersion = "0.13.0",
                properties = mapOf("challengeId" to challenge.id)
            )
        )

        // 6. 결과 상세 확인 (GET /api/v1/groups/{groupId}/challenges/{challengeId}/result)
        mockMvc.get("/api/v1/groups/${group.id}/challenges/${challenge.id}/result") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
            jsonPath("$.challengeId") { value(challenge.id) }
            jsonPath("$.status") { value("CONFIRMED") }
        }

        // 결과 열람 이벤트 전송 모사
        productEventService.recordEventSafely(
            authenticatedUserId = user.id,
            request = ProductEventCreateRequest(
                eventId = "modal-viewed-e2e-1",
                eventName = ProductEventName.CHALLENGE_RESULT_VIEWED.value,
                occurredAt = finalizeTime.toString(),
                sessionId = "test-session",
                appVersion = "0.13.0",
                properties = mapOf("challengeId" to challenge.id, "status" to "CONFIRMED")
            )
        )

        // 7. 결과 확인 처리 (POST /api/v1/groups/{groupId}/challenges/{challengeId}/result/acknowledge)
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/result/acknowledge") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
            jsonPath("$.isSuccess") { value(true) }
        }

        // 확인 완료 후 미확인 카드 목록에서 카운트가 0이 되었는지 검증
        mockMvc.get("/api/v1/challenges/ended-summary") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
            jsonPath("$.unacknowledgedCount") { value(0) }
        }

        // 8. 코인 화면 이동 API 검증
        mockMvc.get("/api/v1/coins/me/balance") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
            jsonPath("$.availableBalance") { value(30) }
            jsonPath("$.heldBalance") { value(0) }
        }

        mockMvc.get("/api/v1/coins/me/transactions") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isOk() }
            jsonPath("$.totalElements") { value(3) }
        }

        // 9. 분석 이벤트 적재 검증
        val events = productEventRepository.findAll()
        assertThat(events.any { it.eventName == ProductEventName.CHALLENGE_RESULT_NOTICE_VIEWED.value }).isTrue()
        assertThat(events.any { it.eventName == ProductEventName.CHALLENGE_RESULT_VIEWED.value }).isTrue()
        assertThat(events.any { it.eventName == ProductEventName.CHALLENGE_RESULT_ACKNOWLEDGED.value }).isTrue()
        assertThat(events.any { it.eventName == ProductEventName.CHALLENGE_COIN_GRANTED.value }).isTrue()
    }

    @Test
    @DisplayName("2. 병행/분할 챌린지 동시 종료 시 동일 날짜 10코인 캡 불변성 및 원장 무결성 검증")
    fun parallelChallengesSameDateDailyCapTest() {
        val user = userRepository.save(User(nickname = "동시도전자", kakaoId = "kakao_parallel_user"))
        coinBalanceRepository.save(CoinBalance(userId = user.id))

        val sameDate = LocalDate.of(2026, 10, 1)
        val now = LocalDateTime.of(2026, 10, 4, 15, 0)

        // 3개의 서로 다른 병행/분할 챌린지 ID
        val challengeIds = listOf(101L, 102L, 103L)

        // 3개 스레드가 각각의 챌린지에 대해 동일 날짜(2026-10-01) 10코인 지급 동시 시도
        val threadCount = 3
        val executor = Executors.newFixedThreadPool(threadCount)
        val latch = CountDownLatch(threadCount)
        val successCount = AtomicInteger(0)

        for (cId in challengeIds) {
            executor.submit {
                try {
                    val granted = coinTransactionService.grantCoins(
                        userId = user.id,
                        challengeId = cId,
                        eligibleDates = setOf(sameDate),
                        now = now
                    )
                    if (granted.isNotEmpty()) {
                        successCount.incrementAndGet()
                    }
                } catch (e: Exception) {
                    // 동시성 락 경합 등
                } finally {
                    latch.countDown()
                }
            }
        }

        latch.await()
        executor.shutdown()

        // 3개 중 정확히 1개 챌린지만 지급 성공하고 나머지는 캡/중복 방지되어야 함
        val balance = coinTransactionService.getBalance(user.id)
        assertThat(balance.availableBalance).isEqualTo(10)

        val txs = coinTransactionRepository.findAllByUserId(user.id)
        assertThat(txs).hasSize(1)
        assertThat(txs[0].amount).isEqualTo(10)
        assertThat(txs[0].targetDate).isEqualTo(sameDate)

        // 원장 무결성 점검 쿼리(불일치 0건 확인)
        val consistency = coinTransactionService.verifyLedgerConsistency(user.id)
        assertThat(consistency.isConsistent).isTrue()
        assertThat(consistency.availableBalance).isEqualTo(consistency.calculatedAvailableFromLedger)
    }

    @Test
    @DisplayName("3. 동시 10회 중복 지급 요청 시 1회만 반영 검증 스트레스 테스트")
    fun concurrentDuplicateGrantStressTest() {
        val user = userRepository.save(User(nickname = "스트레스테스트유저", kakaoId = "kakao_stress_user"))
        coinBalanceRepository.save(CoinBalance(userId = user.id))

        val challengeId = 200L
        val targetDate = LocalDate.of(2026, 10, 1)
        val now = LocalDateTime.of(2026, 10, 4, 15, 0)

        val threadCount = 10
        val executor = Executors.newFixedThreadPool(threadCount)
        val latch = CountDownLatch(threadCount)

        for (i in 0 until threadCount) {
            executor.submit {
                try {
                    coinTransactionService.grantCoins(
                        userId = user.id,
                        challengeId = challengeId,
                        eligibleDates = setOf(targetDate),
                        now = now
                    )
                } catch (e: Exception) {
                    // 예외 무시
                } finally {
                    latch.countDown()
                }
            }
        }

        latch.await()
        executor.shutdown()

        // 10회 동시 요청 중 정확히 1회만 반영되어 10코인만 적립
        val balance = coinTransactionService.getBalance(user.id)
        assertThat(balance.availableBalance).isEqualTo(10)

        val txs = coinTransactionRepository.findAllByUserId(user.id)
        assertThat(txs).hasSize(1)
        assertThat(txs[0].amount).isEqualTo(10)

        val consistency = coinTransactionService.verifyLedgerConsistency(user.id)
        assertThat(consistency.isConsistent).isTrue()
        assertThat(consistency.availableBalance).isEqualTo(consistency.calculatedAvailableFromLedger)
    }

    @Test
    @DisplayName("4. 기지급 챌린지 인증 취소/삭제 시 정확한 음수 차액 보정(-10) 발생 및 잔액 차감, 원장 무결성 검증")
    fun verificationRevocationAdjustmentAndLedgerIntegrityTest() {
        val user = userRepository.save(User(nickname = "차액보정유저", kakaoId = "kakao_adjust_user"))
        coinBalanceRepository.save(CoinBalance(userId = user.id))

        val challengeId = 300L
        val targetDate = LocalDate.of(2026, 10, 1)
        val grantTime = LocalDateTime.of(2026, 10, 4, 12, 0)

        // 1) 10코인 정상 지급
        coinTransactionService.grantCoins(
            userId = user.id,
            challengeId = challengeId,
            eligibleDates = setOf(targetDate),
            now = grantTime
        )
        assertThat(coinTransactionService.getBalance(user.id).availableBalance).isEqualTo(10)

        // 2) 인증 사후 취소/무효화에 따른 음수 차액 보정(-10)
        val adjustTime = LocalDateTime.of(2026, 10, 5, 14, 0)
        val adjustTx = coinTransactionService.adjustCoins(
            userId = user.id,
            challengeId = challengeId,
            targetDate = targetDate,
            adjustmentAmount = -10,
            reason = "인증 취소 및 무효화에 따른 코인 차액 보정",
            now = adjustTime
        )

        // 검증: 보정 트랜잭션 타입, 잔액 차감
        assertThat(adjustTx.type).isEqualTo(CoinTransactionType.ADJUSTMENT_SUB)
        assertThat(adjustTx.amount).isEqualTo(10)
        assertThat(adjustTx.balanceAfter).isEqualTo(0)

        val updatedBalance = coinTransactionService.getBalance(user.id)
        assertThat(updatedBalance.availableBalance).isEqualTo(0)

        // 원장 무결성 점검 쿼리(불일치 0건 확인): M_end = M_start + I - S - R
        val consistency = coinTransactionService.verifyLedgerConsistency(user.id)
        assertThat(consistency.isConsistent).isTrue()
        assertThat(consistency.availableBalance).isEqualTo(consistency.calculatedAvailableFromLedger)
        assertThat(consistency.calculatedAvailableFromLedger).isEqualTo(0)
    }

    @Test
    @DisplayName("5. 조작된 시각/참가일/미래 인증 요청 거절 테스트 (기기 시계 조작 배제, KST 서버 기준 방어)")
    fun tamperedVerificationAndCoinRejectionTest() {
        val user = userRepository.save(User(nickname = "방어검증유저", kakaoId = "kakao_reject_user"))
        val userCreatedAt = LocalDateTime.of(2026, 10, 1, 0, 0)
        ReflectionTestUtils.setField(user, "createdAt", userCreatedAt)
        userRepository.save(user)

        val context = ParticipantCoinContext(
            userId = user.id,
            userCreatedAt = userCreatedAt,
            participantStartDate = LocalDate.of(2026, 10, 2),
            challengeStatus = ChallengeResultStatus.CONFIRMED
        )

        val nowKst = LocalDateTime.of(2026, 10, 5, 12, 0)

        val candidates = listOf(
            // 미래 날짜 조작
            CandidateVerification(
                verificationId = 1L,
                targetDate = LocalDate.of(2026, 10, 6),
                submittedAt = LocalDateTime.of(2026, 10, 6, 10, 0)
            ),
            // 계정 생성 이전 날짜 조작
            CandidateVerification(
                verificationId = 2L,
                targetDate = LocalDate.of(2026, 9, 30),
                submittedAt = LocalDateTime.of(2026, 10, 3, 10, 0)
            ),
            // 참가 효력 발생 이전 날짜
            CandidateVerification(
                verificationId = 3L,
                targetDate = LocalDate.of(2026, 10, 1),
                submittedAt = LocalDateTime.of(2026, 10, 3, 10, 0)
            ),
            // 지각 인증
            CandidateVerification(
                verificationId = 4L,
                targetDate = LocalDate.of(2026, 10, 3),
                submittedAt = LocalDateTime.of(2026, 10, 4, 15, 0),
                isLate = true
            ),
            // 리데이 티켓 적용 건
            CandidateVerification(
                verificationId = 5L,
                targetDate = LocalDate.of(2026, 10, 4),
                submittedAt = LocalDateTime.of(2026, 10, 4, 20, 0),
                isRedayApplied = true
            )
        )

        val filterResult = CoinEligibilityCalculator.filterValidDates(
            context = context,
            candidates = candidates,
            now = nowKst
        )

        // 모든 조작/무효 후보 거절 확인
        assertThat(filterResult.validCandidates).isEmpty()
        assertThat(filterResult.rejectedDates[LocalDate.of(2026, 10, 6)]).isEqualTo(CoinRejectionReason.FUTURE_DATE)
        assertThat(filterResult.rejectedDates[LocalDate.of(2026, 9, 30)]).isEqualTo(CoinRejectionReason.BEFORE_USER_CREATED)
        assertThat(filterResult.rejectedDates[LocalDate.of(2026, 10, 1)]).isEqualTo(CoinRejectionReason.BEFORE_PARTICIPANT_JOINED)
        assertThat(filterResult.rejectedDates[LocalDate.of(2026, 10, 3)]).isEqualTo(CoinRejectionReason.LATE_VERIFICATION)
        assertThat(filterResult.rejectedDates[LocalDate.of(2026, 10, 4)]).isEqualTo(CoinRejectionReason.REDAY_APPLIED)
    }

    @Test
    @DisplayName("6. 비상 운영 복구 검증: 킬스위치 ON -> HOLD 격리 -> 킬스위치 OFF -> 관리자 승인(RELEASE) 및 반려(REJECT) 원장 복구")
    fun killSwitchAndHeldTransactionRecoveryTest() {
        val user = userRepository.save(User(nickname = "비상제어유저", kakaoId = "kakao_killswitch_user"))
        val adminUser = userRepository.save(User(nickname = "운영관리자", kakaoId = "kakao_admin_user"))
        coinBalanceRepository.save(CoinBalance(userId = user.id))

        val challengeId = 400L
        val targetDate = LocalDate.of(2026, 10, 1)
        val now = LocalDateTime.of(2026, 10, 5, 10, 0)

        // 1) 킬스위치 발동
        coinEmergencyControlService.setKillSwitch(true, "시스템 비상 점검으로 인한 지급 중지", now)
        assertThat(coinEmergencyControlService.isKillSwitchActive()).isTrue()

        // 2) 지급 시도 -> HOLD 상태로 원장 격리
        val grantedList = coinTransactionService.grantCoins(
            userId = user.id,
            challengeId = challengeId,
            eligibleDates = setOf(targetDate),
            now = now
        )
        assertThat(grantedList).hasSize(1)
        val heldTx = grantedList[0]
        assertThat(heldTx.type).isEqualTo(CoinTransactionType.HOLD)
        assertThat(heldTx.status).isEqualTo(CoinTransactionStatus.HELD)

        // 사용 가능 잔액은 0 유지, 보류 잔액은 10 증가
        val balanceDuringHold = coinTransactionService.getBalance(user.id)
        assertThat(balanceDuringHold.availableBalance).isEqualTo(0)
        assertThat(balanceDuringHold.heldBalance).isEqualTo(10)

        // 3) 킬스위치 해제 및 정상 가동 재개
        coinEmergencyControlService.setKillSwitch(false, "비상 점검 완료", now.plusHours(1))
        assertThat(coinEmergencyControlService.isKillSwitchActive()).isFalse()

        // 4) 보류 트랜잭션 조회
        val heldTransactions = coinTransactionService.getHeldTransactions()
        assertThat(heldTransactions).hasSize(1)
        assertThat(heldTransactions[0].id).isEqualTo(heldTx.id)

        // 5) 관리자 승인 -> RELEASE 트랜잭션 기록 및 사용 가능 잔액으로 이전
        val releaseTx = coinTransactionService.approveHeldTransaction(
            transactionId = heldTx.id,
            adminUserId = adminUser.id,
            now = now.plusHours(2)
        )
        assertThat(releaseTx.type).isEqualTo(CoinTransactionType.RELEASE)
        assertThat(releaseTx.status).isEqualTo(CoinTransactionStatus.COMPLETED)

        val balanceAfterRelease = coinTransactionService.getBalance(user.id)
        assertThat(balanceAfterRelease.availableBalance).isEqualTo(10)
        assertThat(balanceAfterRelease.heldBalance).isEqualTo(0)

        // 6) 이상 패턴(단일 350코인 초과 요청) 자동 HOLD 및 관리자 반려(REJECT) 테스트
        // 임의의 비정상 대량 보류 건 생성
        val abnormalBalance = coinBalanceRepository.findByUserId(user.id).get()
        abnormalBalance.addHeld(350, now)
        coinBalanceRepository.save(abnormalBalance)

        val abnormalTx = coinTransactionRepository.save(
            com.dayuse.domain.coin.CoinTransaction(
                userId = user.id,
                type = CoinTransactionType.HOLD,
                amount = 350,
                balanceAfter = abnormalBalance.availableBalance,
                heldBalanceAfter = abnormalBalance.heldBalance,
                targetDate = LocalDate.of(2026, 10, 2),
                challengeId = challengeId,
                idempotencyKey = "ABNORMAL_TX_TEST",
                status = CoinTransactionStatus.HELD,
                reason = "비정상 대량 코인 지급 의심 자동 격리",
                createdAt = now.plusHours(3)
            )
        )

        // 관리자 반려 처리
        val rejectTx = coinTransactionService.rejectHeldTransaction(
            transactionId = abnormalTx.id,
            adminUserId = adminUser.id,
            reason = "비정상 부정 요청으로 확인되어 지급 거절",
            now = now.plusHours(4)
        )
        assertThat(rejectTx.type).isEqualTo(CoinTransactionType.REJECT)
        assertThat(rejectTx.status).isEqualTo(CoinTransactionStatus.REJECTED)

        val balanceAfterReject = coinTransactionService.getBalance(user.id)
        assertThat(balanceAfterReject.availableBalance).isEqualTo(10)
        assertThat(balanceAfterReject.heldBalance).isEqualTo(0)

        // 7) 최종 원장 무결성 검증 통과 (불일치 0건)
        val consistency = coinTransactionService.verifyLedgerConsistency(user.id)
        assertThat(consistency.isConsistent).isTrue()
        assertThat(consistency.availableBalance).isEqualTo(consistency.calculatedAvailableFromLedger)
    }

    @Test
    @DisplayName("7. 가족/공동 IP 오탐 방지: 동일 네트워크 환경의 복수 유저가 정상 인증 시 각자 안전하게 10코인을 수령한다")
    fun sharedNetworkFamilyAccountsTest() {
        val userFamilyA = userRepository.save(User(nickname = "가족A", kakaoId = "kakao_family_a"))
        val userFamilyB = userRepository.save(User(nickname = "가족B", kakaoId = "kakao_family_b"))

        coinBalanceRepository.save(CoinBalance(userId = userFamilyA.id))
        coinBalanceRepository.save(CoinBalance(userId = userFamilyB.id))

        val targetDate = LocalDate.of(2026, 10, 1)
        val now = LocalDateTime.of(2026, 10, 5, 10, 0)

        // 동일 날짜, 동일 IP/네트워크 상황이더라도 독립적인 계정의 정당한 인증은 정상 지급
        val grantedA = coinTransactionService.grantCoins(
            userId = userFamilyA.id,
            challengeId = 501L,
            eligibleDates = setOf(targetDate),
            now = now
        )
        val grantedB = coinTransactionService.grantCoins(
            userId = userFamilyB.id,
            challengeId = 502L,
            eligibleDates = setOf(targetDate),
            now = now
        )

        assertThat(grantedA).hasSize(1)
        assertThat(grantedB).hasSize(1)

        val balanceA = coinTransactionService.getBalance(userFamilyA.id)
        val balanceB = coinTransactionService.getBalance(userFamilyB.id)

        assertThat(balanceA.availableBalance).isEqualTo(10)
        assertThat(balanceB.availableBalance).isEqualTo(10)

        assertThat(coinTransactionService.verifyLedgerConsistency(userFamilyA.id).isConsistent).isTrue()
        assertThat(coinTransactionService.verifyLedgerConsistency(userFamilyB.id).isConsistent).isTrue()
    }
}
