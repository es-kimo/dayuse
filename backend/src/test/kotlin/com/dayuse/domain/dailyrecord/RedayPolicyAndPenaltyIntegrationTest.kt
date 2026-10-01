@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.dailyrecord

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.patch
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RedayPolicyAndPenaltyIntegrationTest {

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
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var dailyRecordService: DailyRecordService

    @Autowired
    private lateinit var settlementService: SettlementService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var otherMemberUser: User
    private lateinit var hostToken: String
    private lateinit var otherMemberToken: String
    private lateinit var group: Group

    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "reday_host", nickname = "리데이방장"))
        otherMemberUser = userRepository.save(User(kakaoId = "reday_member", nickname = "리데이멤버"))

        hostToken = jwtTokenProvider.generateAccessToken(hostUser.id)
        otherMemberToken = jwtTokenProvider.generateAccessToken(otherMemberUser.id)

        group = groupRepository.save(
            Group(name = "리데이 테스트 모임", hostUserId = hostUser.id, inviteCode = "REDAY-106")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST)
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = otherMemberUser.id, role = GroupRole.MEMBER)
        )
    }

    @Test
    fun `F01 F14 리데이 허용 챌린지 생성 기본값은 false이며 DAILY 개인 벌금 챌린지만 활성화 가능하다`() {
        // 1. 기본값 false 확인
        val defaultCreated = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "기본 챌린지",
                verificationCriteria = "사진",
                startDate = today.plusDays(1),
                endDate = today.plusDays(7),
                myPenaltyAmount = 3000
            )
        )
        assertFalse(defaultCreated.redayAllowed)
        assertEquals("이 챌린지는 리데이를 허용하지 않아요.", defaultCreated.redayRuleDescription)

        // 2. DAILY + INDIVIDUAL + 벌금 > 0 리데이 허용 생성 성공 및 상세/참여 프리뷰 노출
        val redayCreated = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "리데이 허용 챌린지",
                verificationCriteria = "사진",
                startDate = today.plusDays(1),
                endDate = today.plusDays(7),
                myPenaltyAmount = 5000,
                redayAllowed = true
            )
        )
        assertTrue(redayCreated.redayAllowed)
        assertNotNull(redayCreated.redayRuleDescription)

        mockMvc.get("/api/v1/challenges/${redayCreated.id}/preview-join") {
            header("Authorization", "Bearer $otherMemberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.redayAllowed") { value(true) }
            jsonPath("$.redayRuleDescription") { isNotEmpty() }
        }

        // 3. WEEKLY_N 챌린지 리데이 허용 생성 시 400 예외
        assertThrows(BadRequestException::class.java) {
            challengeService.createChallenge(
                groupId = group.id,
                userId = hostUser.id,
                request = CreateChallengeRequest(
                    title = "주간 챌린지",
                    verificationCriteria = "사진",
                    startDate = today.plusDays(1),
                    endDate = today.plusDays(14),
                    myPenaltyAmount = 5000,
                    periodType = PeriodType.WEEKLY_N,
                    targetFrequency = 3,
                    redayAllowed = true
                )
            )
        }

        // 4. TOGETHER 챌린지 리데이 허용 생성 시 400 예외
        assertThrows(BadRequestException::class.java) {
            challengeService.createChallenge(
                groupId = group.id,
                userId = hostUser.id,
                request = CreateChallengeRequest(
                    title = "함께하기 챌린지",
                    verificationCriteria = "사진",
                    startDate = today.plusDays(1),
                    endDate = today.plusDays(7),
                    myPenaltyAmount = 0,
                    executionType = ExecutionType.TOGETHER,
                    redayAllowed = true
                )
            )
        }

        // 5. 무벌금(0원) 챌린지 리데이 허용 생성 시 400 예외
        assertThrows(BadRequestException::class.java) {
            challengeService.createChallenge(
                groupId = group.id,
                userId = hostUser.id,
                request = CreateChallengeRequest(
                    title = "무벌금 챌린지",
                    verificationCriteria = "사진",
                    startDate = today.plusDays(1),
                    endDate = today.plusDays(7),
                    myPenaltyAmount = 0,
                    redayAllowed = true
                )
            )
        }

        // 6. 리데이 허용 챌린지에 벌금 0원으로 참여 또는 벌금 0원 변경 시도 시 400 예외
        assertThrows(BadRequestException::class.java) {
            challengeService.joinChallenge(
                challengeId = redayCreated.id,
                userId = otherMemberUser.id,
                request = JoinChallengeRequest(penaltyAmount = 0)
            )
        }
        assertThrows(BadRequestException::class.java) {
            challengeService.updateMyPenaltyAmount(
                challengeId = redayCreated.id,
                userId = hostUser.id,
                request = UpdatePenaltyAmountRequest(penaltyAmount = 0)
            )
        }
    }

    @Test
    fun `F01 챌린지 시작 전에는 리데이 허용 여부를 변경할 수 있으나 시작일 이후에는 변경이 차단된다`() {
        val futureChallenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "시작 전 챌린지",
                verificationCriteria = "사진",
                startDate = today.plusDays(2),
                endDate = today.plusDays(7),
                myPenaltyAmount = 5000,
                redayAllowed = false
            )
        )

        // 시작 전 변경 성공
        val updatedBeforeStart = challengeService.updateChallenge(
            challengeId = futureChallenge.id,
            userId = hostUser.id,
            request = UpdateChallengeRequest(
                title = "시작 전 챌린지",
                description = null,
                verificationCriteria = "사진",
                startDate = today.plusDays(2),
                endDate = today.plusDays(7),
                redayAllowed = true
            )
        )
        assertTrue(updatedBeforeStart.redayAllowed)

        // 이미 시작된 챌린지는 redayAllowed 변경 불가
        val startedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "진행 중 챌린지",
                verificationCriteria = "사진",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                redayAllowed = false
            )
        )

        mockMvc.patch("/api/v1/challenges/${startedChallenge.id}") {
            header("Authorization", "Bearer $hostToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(
                UpdateChallengeRequest(
                    title = "진행 중 챌린지",
                    description = null,
                    verificationCriteria = "사진",
                    startDate = today.minusDays(1),
                    endDate = today.plusDays(5),
                    redayAllowed = true
                )
            )
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `F02 F03 지각 인증 시각 구간에 따른 리데이 가능 여부 및 마감 시각 고정 검증`() {
        val targetDate = LocalDate.of(2026, 10, 1)
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "리데이 시간 경계 테스트",
                verificationCriteria = "인증샷",
                startDate = targetDate.minusDays(1),
                endDate = targetDate.plusDays(10),
                redayAllowed = true
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 5000,
                startDate = challenge.startDate
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participant, challenge, targetDate.plusDays(3))

        // 1. 익일 08:59:59 등록 -> LATE (지각 아님, 벌금 없음, 리데이 불필요 NOT_OVERDUE)
        val recordDay0 = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate.minusDays(1))!!
        val earlyLateResp = dailyRecordService.verifyLate(
            recordId = recordDay0.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${challenge.id}/${hostUser.id}/early.jpg",
                comment = "새벽 유예 구간 인증"
            ),
            now = LocalDateTime.of(2026, 10, 1, 8, 59, 59)
        )
        assertFalse(earlyLateResp.isLate)
        assertFalse(earlyLateResp.redayEligible)
        assertEquals(PenaltyStatus.NONE, earlyLateResp.penaltyStatus)
        assertEquals(0, earlyLateResp.penaltyAmount)

        val earlyEligibility = dailyRecordService.checkRedayEligibility(
            recordId = recordDay0.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 1, 8, 59, 59)
        )
        assertFalse(earlyEligibility.eligible)
        assertEquals(RedayIneligibleReason.NOT_OVERDUE, earlyEligibility.reason)

        // 2. 익일 09:00:00 정각 등록 -> OVERDUE_REDAY_ELIGIBLE (지각 인증, 벌금 PENDING, 리데이 가능 ELIGIBLE, 마감 10/03 09:00 고정)
        val recordDay1 = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate)!!
        val overdueResp = dailyRecordService.verifyLate(
            recordId = recordDay1.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${challenge.id}/${hostUser.id}/overdue.jpg",
                comment = "9시 정각 지각 인증"
            ),
            now = LocalDateTime.of(2026, 10, 2, 9, 0, 0)
        )
        assertTrue(overdueResp.isLate)
        assertTrue(overdueResp.redayEligible)
        assertEquals(PenaltyStatus.PENDING, overdueResp.penaltyStatus)
        assertEquals(5000, overdueResp.penaltyAmount)
        assertEquals(LocalDateTime.of(2026, 10, 3, 9, 0, 0), overdueResp.redayDeadline)

        // 익익일 08:59:59 시점에도 리데이 가능
        val beforeDeadlineEligibility = dailyRecordService.checkRedayEligibilityByVerificationId(
            verificationId = overdueResp.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 3, 8, 59, 59)
        )
        assertTrue(beforeDeadlineEligibility.eligible)
        assertEquals(RedayIneligibleReason.ELIGIBLE, beforeDeadlineEligibility.reason)

        // 타인이 리데이 가능 여부 조회 시 NOT_OWNER
        val strangerEligibility = dailyRecordService.checkRedayEligibility(
            recordId = recordDay1.id,
            userId = otherMemberUser.id,
            now = LocalDateTime.of(2026, 10, 2, 12, 0, 0)
        )
        assertFalse(strangerEligibility.eligible)
        assertEquals(RedayIneligibleReason.NOT_OWNER, strangerEligibility.reason)

        // 익익일 09:00:00 정각 시점에는 기한 만료(EXPIRED)로 리데이 불가
        val expiredEligibility = dailyRecordService.checkRedayEligibility(
            recordId = recordDay1.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 3, 9, 0, 0)
        )
        assertFalse(expiredEligibility.eligible)
        assertEquals(RedayIneligibleReason.EXPIRED, expiredEligibility.reason)

        // 3. 익익일 09:00:00 이후 지각 인증 등록 시 -> 마감 시각은 여전히 10/04 09:00으로 고정되며 즉시 CONFIRMED & 리데이 불가
        val targetDate2 = LocalDate.of(2026, 10, 2)
        val recordDay2 = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate2)!!
        val expiredVerifyResp = dailyRecordService.verifyLate(
            recordId = recordDay2.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${challenge.id}/${hostUser.id}/expired.jpg",
                comment = "기한 만료 후 지각 인증"
            ),
            now = LocalDateTime.of(2026, 10, 4, 9, 0, 0)
        )
        assertTrue(expiredVerifyResp.isLate)
        assertFalse(expiredVerifyResp.redayEligible)
        assertEquals(PenaltyStatus.CONFIRMED, expiredVerifyResp.penaltyStatus)
        assertEquals(5000, expiredVerifyResp.penaltyAmount)
        assertEquals(LocalDateTime.of(2026, 10, 4, 9, 0, 0), expiredVerifyResp.redayDeadline)
    }

    @Test
    fun `F04 리데이 가능 시간 동안 벌금은 PENDING으로 유예되어 정산 미납금에서 제외되고 기한 만료 시 CONFIRMED로 전환된다`() {
        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = GroupAccountRequest(
                bankName = "카카오뱅크",
                accountNumber = "3333-01-2345678",
                accountHolder = "리데이방장"
            )
        )

        val targetDate = LocalDate.of(2026, 10, 1)
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "벌금 유예 및 확정 테스트",
                verificationCriteria = "인증샷",
                startDate = targetDate,
                endDate = targetDate.plusDays(2), // 마지막 날 경계까지 확인
                redayAllowed = true
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 5000,
                startDate = challenge.startDate
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participant, challenge, targetDate.plusDays(2))

        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate)!!
        val lastDayRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate.plusDays(2))!!

        // 1. 10/02 10:00 (리데이 가능 시간 내) 미수행 확정 -> PENDING 상태로 유예
        val windowNow = LocalDateTime.of(2026, 10, 2, 10, 0, 0)
        val failedResp = dailyRecordService.markFailed(day1Record.id, hostUser.id, windowNow)
        assertEquals(DailyRecordStatus.FAILED, failedResp.status)
        assertEquals(PenaltyStatus.PENDING, failedResp.penaltyStatus)
        assertEquals(5000, failedResp.penaltyAmount)
        assertEquals(LocalDateTime.of(2026, 10, 3, 9, 0, 0), failedResp.redayDeadline)

        // 2. 유예 구간 동안 상태 요약 및 정산 요약에서 확정 미납금(unpaidPenaltyAmount)은 0원, 유예 벌금(pendingPenaltyAmount)은 5,000원
        val summaryDuringWindow = dailyRecordService.getStatusSummary(group.id, hostUser.id, windowNow)
        assertEquals(0, summaryDuringWindow.unpaidPenaltyAmount)
        assertEquals(5000, summaryDuringWindow.pendingPenaltyAmount)

        val settlementSummaryDuringWindow = settlementService.getSettlementSummary(group.id, hostUser.id, windowNow)
        assertEquals(0, settlementSummaryDuringWindow.myUnpaidAmount)
        assertEquals(5000, settlementSummaryDuringWindow.myPendingAmount)

        // 미납 목록(/unpaid-records)에서도 제외되며, 송금 완료 신청 시도 시 차단됨
        val unpaidListDuringWindow = settlementService.getUnpaidRecords(group.id, hostUser.id, windowNow)
        assertTrue(unpaidListDuringWindow.isEmpty())

        assertThrows(BadRequestException::class.java) {
            settlementService.createDepositReport(
                groupId = group.id,
                userId = hostUser.id,
                request = CreateDepositReportRequest(
                    depositorName = "리데이방장",
                    depositDate = targetDate.plusDays(1),
                    totalAmount = 5000,
                    dailyRecordIds = listOf(day1Record.id)
                ),
                now = windowNow
            )
        }

        // 3. 챌린지 마지막 날(10/03) 실패 건도 마지막 날 + 2일 09:00(10/05 09:00) 전까지는 동일하게 PENDING 유예
        val afterLastDayNow = LocalDateTime.of(2026, 10, 4, 12, 0, 0)
        val lastDayFailed = dailyRecordService.markFailed(lastDayRecord.id, hostUser.id, afterLastDayNow)
        assertEquals(PenaltyStatus.PENDING, lastDayFailed.penaltyStatus)
        assertEquals(LocalDateTime.of(2026, 10, 5, 9, 0, 0), lastDayFailed.redayDeadline)

        // 4. 10/04 12:00 시점 조회 시:
        //    - day1Record(마감 10/03 09:00)는 기한 만료로 자동 CONFIRMED 전환 -> unpaid 5,000원
        //    - lastDayRecord(마감 10/05 09:00)는 아직 유예 중 -> pending 5,000원
        val summaryAfterDay1Expired = dailyRecordService.getStatusSummary(group.id, hostUser.id, afterLastDayNow)
        assertEquals(5000, summaryAfterDay1Expired.unpaidPenaltyAmount)
        assertEquals(5000, summaryAfterDay1Expired.pendingPenaltyAmount)

        val unpaidListAfterDay1Expired = settlementService.getUnpaidRecords(group.id, hostUser.id, afterLastDayNow)
        assertEquals(1, unpaidListAfterDay1Expired.size)
        assertEquals(day1Record.id, unpaidListAfterDay1Expired.first().id)

        // 5. 10/05 09:00 시점(마지막 날 리데이 기한 만료) 조회 시:
        //    - lastDayRecord도 CONFIRMED로 전환 -> unpaid 총 10,000원, pending 0원
        val afterAllExpiredNow = LocalDateTime.of(2026, 10, 5, 9, 0, 0)
        val summaryAfterAllExpired = dailyRecordService.getStatusSummary(group.id, hostUser.id, afterAllExpiredNow)
        assertEquals(10000, summaryAfterAllExpired.unpaidPenaltyAmount)
        assertEquals(0, summaryAfterAllExpired.pendingPenaltyAmount)
    }

    @Test
    fun `F03 F04 리데이 완료(EXEMPTED) 건은 기한이 지나도 다시 벌금이 확정되지 않으며 중복 리데이가 차단된다`() {
        val targetDate = LocalDate.of(2026, 10, 1)
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "리데이 면제 불변성 테스트",
                verificationCriteria = "인증샷",
                startDate = targetDate,
                endDate = targetDate.plusDays(5),
                redayAllowed = true
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 5000,
                startDate = challenge.startDate
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participant, challenge, targetDate.plusDays(2))

        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant.id, targetDate)!!
        val verifyNow = LocalDateTime.of(2026, 10, 2, 10, 0, 0)

        val verifyResp = dailyRecordService.verifyLate(
            recordId = record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${challenge.id}/${hostUser.id}/late.jpg",
                comment = "지각 인증"
            ),
            now = verifyNow
        )

        // 리데이 가능 API 엔드포인트 호출 검증
        mockMvc.get("/api/v1/daily-records/${record.id}/reday-eligibility") {
            header("Authorization", "Bearer $hostToken")
        }.andExpect {
            status { isOk() }
        }

        // 리데이 적용 시뮬레이션 (도메인 메서드 호출)
        record.applyReday(LocalDateTime.of(2026, 10, 2, 11, 0, 0))
        assertEquals(PenaltyStatus.EXEMPTED, record.penaltyStatus)
        assertEquals(0, record.penaltyAmount)
        assertTrue(record.redayApplied)

        // 중복 리데이 가능 여부 조회 시 ALREADY_APPLIED 반환
        val afterRedayEligibility = dailyRecordService.checkRedayEligibilityByVerificationId(
            verificationId = verifyResp.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 2, 12, 0, 0)
        )
        assertFalse(afterRedayEligibility.eligible)
        assertEquals(RedayIneligibleReason.ALREADY_APPLIED, afterRedayEligibility.reason)

        // 기한(10/03 09:00) 경과 후에도 EXEMPTED 유지 및 미납금 0원
        val summaryAfterDeadline = dailyRecordService.getStatusSummary(
            groupId = group.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 4, 10, 0, 0)
        )
        assertEquals(0, summaryAfterDeadline.unpaidPenaltyAmount)
        assertEquals(0, summaryAfterDeadline.pendingPenaltyAmount)
        assertEquals(PenaltyStatus.EXEMPTED, record.penaltyStatus)
    }
}
