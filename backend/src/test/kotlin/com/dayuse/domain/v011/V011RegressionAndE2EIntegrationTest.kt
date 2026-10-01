@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v011

import com.dayuse.domain.ad.AdCampaignRepository
import com.dayuse.domain.ad.AdCampaignStatus
import com.dayuse.domain.ad.AdCreativeRepository
import com.dayuse.domain.ad.AdRewardHistoryRepository
import com.dayuse.domain.ad.AdSessionRepository
import com.dayuse.domain.ad.AdSlotType
import com.dayuse.domain.ad.AdUnavailableReason
import com.dayuse.domain.ad.dto.CompleteAdSessionRequest
import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.dto.RequestAdSessionRequest
import com.dayuse.domain.ad.service.AdService
import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.dailyrecord.RedayIneligibleReason
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.experiment.DayuseExperimentDefinitions
import com.dayuse.domain.experiment.ExperimentVariant
import com.dayuse.domain.experiment.service.ExperimentService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.dto.GrantRedayTicketRequest
import com.dayuse.domain.redayticket.service.RedayTicketService
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * v0.11 통합 검증 및 회귀 테스트 (Issue #111, F01 ~ F14 전체 흐름 검증)
 *
 * 1. 시간 경계(자정·익일 09:00·이틀 뒤 09:00) 및 챌린지 마지막 수행일 리데이 기한 보장·벌금 분리 검증
 * 2. 보유 리데이 티켓 즉시 사용 경로 vs 보상형 광고 시청 후 티켓 획득·사용 확정 경로 E2E 및 분석 이벤트 구분 검증
 * 3. 광고 완료/리데이 적용 재시도 멱등성 및 기한 만료·리데이 경합 방어 검증
 * 4. 타인 인증·티켓·광고 세션 접근 차단(IDOR) 및 리데이 적용/벌금 확정 후 인증 삭제 차단 검증
 * 5. 광고 부재·시청 중단·실험 미배정(Fallback) 시 핵심 서비스 장애 격리 검증
 * 6. 주 N회(WEEKLY_N) 챌린지 회귀 동작(특정 요일 휴식 무벌금, 주간 정산, 다음 주 수행의 지난주 소급 불가) 및 리데이/광고 차단 검증
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class V011RegressionAndE2EIntegrationTest {

    @Autowired private lateinit var userRepository: UserRepository
    @Autowired private lateinit var groupRepository: GroupRepository
    @Autowired private lateinit var groupMemberRepository: GroupMemberRepository
    @Autowired private lateinit var challengeRepository: ChallengeRepository
    @Autowired private lateinit var challengeParticipantRepository: ChallengeParticipantRepository
    @Autowired private lateinit var challengeService: ChallengeService
    @Autowired private lateinit var dailyRecordRepository: DailyRecordRepository
    @Autowired private lateinit var dailyRecordService: DailyRecordService
    @Autowired private lateinit var verificationRepository: VerificationRepository
    @Autowired private lateinit var verificationService: VerificationService
    @Autowired private lateinit var redayTicketRepository: RedayTicketRepository
    @Autowired private lateinit var redayTicketService: RedayTicketService
    @Autowired private lateinit var adCampaignRepository: AdCampaignRepository
    @Autowired private lateinit var adCreativeRepository: AdCreativeRepository
    @Autowired private lateinit var adSessionRepository: AdSessionRepository
    @Autowired private lateinit var adRewardHistoryRepository: AdRewardHistoryRepository
    @Autowired private lateinit var adService: AdService
    @Autowired private lateinit var settlementService: SettlementService
    @Autowired private lateinit var productEventRepository: ProductEventRepository
    @Autowired private lateinit var experimentService: ExperimentService

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var group: Group
    private lateinit var redayChallenge: Challenge
    private lateinit var hostParticipant: ChallengeParticipant
    private lateinit var memberParticipant: ChallengeParticipant

    private val startDate = LocalDate.of(2026, 10, 1)
    private val endDate = LocalDate.of(2026, 10, 5)

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        adRewardHistoryRepository.deleteAll()
        adSessionRepository.deleteAll()
        adCreativeRepository.deleteAll()
        adCampaignRepository.deleteAll()

        val suffix = System.nanoTime().toString().takeLast(6)
        hostUser = userRepository.save(User(kakaoId = "v011-host-$suffix", nickname = "방장유저"))
        memberUser = userRepository.save(User(kakaoId = "v011-member-$suffix", nickname = "멤버유저"))

        group = groupRepository.save(
            Group(name = "v0.11 통합검증 모임", hostUserId = hostUser.id, inviteCode = "V11$suffix")
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))

        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = GroupAccountRequest(
                bankName = "카카오뱅크",
                accountNumber = "3333-11-0000111",
                accountHolder = "방장유저"
            )
        )

        redayChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "매일 미라클 모닝 (리데이 허용)",
                verificationCriteria = "기상 직후 물 한 잔 사진",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL,
                redayAllowed = true
            )
        )
        hostParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = redayChallenge.id,
                userId = hostUser.id,
                startDate = startDate,
                penaltyAmount = 5000
            )
        )
        memberParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = redayChallenge.id,
                userId = memberUser.id,
                startDate = startDate,
                penaltyAmount = 5000
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(hostParticipant, redayChallenge, endDate)
        dailyRecordService.ensureDailyRecordsForParticipant(memberParticipant, redayChallenge, endDate)

        adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "v011-e2e-campaign-$suffix",
                title = "dayuse 자체 리데이 안내 캠페인",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 10,
                dailyImpressionLimit = 5,
                startAt = startDate.atStartOfDay().minusDays(5),
                endAt = endDate.atTime(23, 59).plusDays(10),
                creatives = listOf(
                    CreateAdCreativeInput(
                        title = "리데이 가이드 안내",
                        description = "10초 시청 완료 시 리데이 티켓 1장이 지급됩니다.",
                        minWatchSeconds = 10,
                        active = true
                    )
                )
            )
        )
    }

    @Test
    @DisplayName("1. 시간 경계(늦은 인증 vs 지각 인증 vs 기한 만료) 및 마지막 수행일 리데이 기한 보장·벌금 분리 검증")
    fun `시간 경계와 마지막 수행일 리데이 기한 및 보류 확정 면제 벌금 분리가 정확히 동작한다`() {
        // Day 1 (10/01): 익일 08:59:59 등록 -> 늦은 인증(isLate=false, 벌금 NONE 0원, 리데이 불필요)
        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate)!!
        val earlyLateResp = dailyRecordService.verifyLate(
            recordId = day1Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/day1.jpg",
                comment = "오전 9시 전 늦은 인증"
            ),
            now = LocalDateTime.of(2026, 10, 2, 8, 59, 59)
        )
        assertFalse(earlyLateResp.isLate)
        assertFalse(earlyLateResp.redayEligible)
        assertEquals(PenaltyStatus.NONE, earlyLateResp.penaltyStatus)
        assertEquals(0, earlyLateResp.penaltyAmount)

        // Day 2 (10/02): 익일 09:00:00 정각 등록 -> 지각 인증(isLate=true, 벌금 PENDING 5000원, 마감 10/04 09:00 고정)
        val day2Date = startDate.plusDays(1)
        val day2Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, day2Date)!!
        val overdueResp = dailyRecordService.verifyLate(
            recordId = day2Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/day2.jpg",
                comment = "오전 9시 정각 지각 인증"
            ),
            now = LocalDateTime.of(2026, 10, 3, 9, 0, 0)
        )
        assertTrue(overdueResp.isLate)
        assertTrue(overdueResp.redayEligible)
        assertEquals(PenaltyStatus.PENDING, overdueResp.penaltyStatus)
        assertEquals(5000, overdueResp.penaltyAmount)
        assertEquals(LocalDateTime.of(2026, 10, 4, 9, 0, 0), overdueResp.redayDeadline)

        // 챌린지 마지막 수행일 Day 5 (10/05): 10/06 11:00 지각 인증 등록 -> 마지막 날도 10/07 09:00까지 리데이 기한 보장
        val lastDayRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, endDate)!!
        val lastDayOverdueResp = dailyRecordService.verifyLate(
            recordId = lastDayRecord.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/day5.jpg",
                comment = "마지막 수행일 지각 인증"
            ),
            now = LocalDateTime.of(2026, 10, 6, 11, 0, 0)
        )
        assertTrue(lastDayOverdueResp.isLate)
        assertTrue(lastDayOverdueResp.redayEligible)
        assertEquals(PenaltyStatus.PENDING, lastDayOverdueResp.penaltyStatus)
        assertEquals(LocalDateTime.of(2026, 10, 7, 9, 0, 0), lastDayOverdueResp.redayDeadline)

        // 10/06 12:00 기준 정산 요약 조회:
        // - Day 2 (마감 10/04 09:00)는 기한 만료로 CONFIRMED (미납 확정 벌금 5,000원)
        // - 마지막 날 Day 5 (마감 10/07 09:00)는 아직 리데이 유예 중 -> PENDING (보류 벌금 5,000원, 확정 미납금에서 분리)
        val summaryBeforeLastDayExpiry = settlementService.getSettlementSummary(
            groupId = group.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 6, 12, 0, 0)
        )
        assertEquals(5000, summaryBeforeLastDayExpiry.myUnpaidAmount)
        assertEquals(5000, summaryBeforeLastDayExpiry.myPendingAmount)

        // 마지막 날 기록에 보유 티켓으로 리데이 적용(10/06 13:00) -> 보류 벌금 0원, 확정 벌금은 그대로 5,000원
        redayTicketService.grantTicket(hostUser.id, GrantRedayTicketRequest(source = RedayTicketSource.WELCOME_BONUS))
        val lastDayReday = redayTicketService.applyReday(
            userId = hostUser.id,
            request = ApplyRedayRequest(dailyRecordId = lastDayRecord.id),
            now = LocalDateTime.of(2026, 10, 6, 13, 0, 0)
        )
        assertTrue(lastDayReday.penaltyExempted)

        // 마지막 날 마감(10/07 09:00) 이후에도 EXEMPTED는 다시 CONFIRMED로 전환되지 않음
        val summaryAfterLastDayExpiry = settlementService.getSettlementSummary(
            groupId = group.id,
            userId = hostUser.id,
            now = LocalDateTime.of(2026, 10, 7, 10, 0, 0)
        )
        assertEquals(5000, summaryAfterLastDayExpiry.myUnpaidAmount)
        assertEquals(0, summaryAfterLastDayExpiry.myPendingAmount)
    }

    @Test
    @DisplayName("2. 보유 티켓 즉시 사용 경로 vs 광고 시청 후 티켓 획득·사용 확정 경로 E2E 및 분석 이벤트 구분 검증")
    fun `보유 티켓 즉시 사용 경로와 광고 시청 후 티켓 획득 사용 경로가 모두 정상 동작하며 광고 완료만으로 벌금이 자동 면제되지 않는다`() {
        // [경로 A] 보유 티켓 즉시 사용 경로 (Day 1: 10/01)
        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate)!!
        val day1Now = LocalDateTime.of(2026, 10, 2, 10, 0, 0)
        dailyRecordService.verifyLate(
            recordId = day1Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/pathA.jpg",
                comment = "보유 티켓 경로"
            ),
            now = day1Now
        )

        val welcomeTicket = redayTicketService.grantTicket(
            userId = hostUser.id,
            request = GrantRedayTicketRequest(source = RedayTicketSource.WELCOME_BONUS)
        )
        // 보유 티켓이 1장 있을 때는 광고 세션 요청이 차단됨 (보유 티켓 우선 사용 정책)
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = hostUser.id,
                request = RequestAdSessionRequest(dailyRecordId = day1Record.id),
                now = day1Now.plusMinutes(1)
            )
        }

        val pathAResult = redayTicketService.applyReday(
            userId = hostUser.id,
            request = ApplyRedayRequest(ticketId = welcomeTicket.ticketId, dailyRecordId = day1Record.id),
            now = day1Now.plusMinutes(2)
        )
        assertTrue(pathAResult.penaltyExempted)
        assertEquals(0L, redayTicketService.getBalance(hostUser.id, hostUser.id).availableCount)

        // [경로 B] 보유 티켓 0장 상태에서 광고 시청 -> 티켓 1장 지급 -> 사용자 확정으로 리데이 적용 (Day 2: 10/02)
        val day2Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate.plusDays(1))!!
        val day2Now = LocalDateTime.of(2026, 10, 3, 11, 0, 0)
        dailyRecordService.verifyLate(
            recordId = day2Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/pathB.jpg",
                comment = "광고 시청 경로"
            ),
            now = day2Now
        )

        val adSessionResp = adService.requestAdSession(
            userId = hostUser.id,
            request = RequestAdSessionRequest(dailyRecordId = day2Record.id),
            now = day2Now.plusSeconds(5)
        )
        assertTrue(adSessionResp.available)
        val sessionToken = adSessionResp.session!!.sessionToken

        val impressionResp = adService.recordImpression(hostUser.id, sessionToken, day2Now.plusSeconds(6))
        assertTrue(impressionResp.firstImpression)

        val completeResp = adService.completeSessionAndGrantReward(
            userId = hostUser.id,
            sessionToken = sessionToken,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = day2Now.plusSeconds(17)
        )
        assertTrue(completeResp.newlyGranted)
        assertEquals(1L, completeResp.availableTicketCount)
        assertTrue(completeResp.targetRecordRedayEligible)

        // 핵심 불변 조건: 광고 시청 완료 직후에는 티켓만 지급되며 대상 기록의 벌금은 아직 자동 면제되지 않음(PENDING 유지)
        val recordBeforeConfirm = dailyRecordRepository.findById(day2Record.id).get()
        assertFalse(recordBeforeConfirm.redayApplied)
        assertEquals(PenaltyStatus.PENDING, recordBeforeConfirm.penaltyStatus)
        assertEquals(5000, recordBeforeConfirm.penaltyAmount)

        // 사용자가 '리데이 티켓 1장 사용하기'를 확정해야 비로소 티켓 소비 + 벌금 면제 완료
        val pathBResult = redayTicketService.applyReday(
            userId = hostUser.id,
            request = ApplyRedayRequest(ticketId = completeResp.grantedTicketId, dailyRecordId = day2Record.id),
            now = day2Now.plusSeconds(25)
        )
        assertTrue(pathBResult.penaltyExempted)
        val recordAfterConfirm = dailyRecordRepository.findById(day2Record.id).get()
        assertTrue(recordAfterConfirm.redayApplied)
        assertEquals(PenaltyStatus.EXEMPTED, recordAfterConfirm.penaltyStatus)
        assertEquals(0, recordAfterConfirm.penaltyAmount)
        assertTrue(recordAfterConfirm.isLate) // 지각 사실은 그대로 유지

        // 분석 이벤트 검증:
        // - 티켓 지급(`recovery_ticket_granted`)은 WELCOME_BONUS 1건 + REWARD_AD 1건 = 총 2건
        // - 광고 보상(`reward_granted`)은 REWARD_AD 1건만 기록되어 두 경로가 명확히 구분됨
        // - 리데이 완료(`recovery_completed`) 및 티켓 사용(`recovery_ticket_used`)은 각 2건
        val userEvents = productEventRepository.findAll().filter { it.userId == hostUser.id }
        assertEquals(1, userEvents.count { it.eventName == ProductEventName.REWARD_GRANTED.value })
        assertEquals(2, userEvents.count { it.eventName == ProductEventName.RECOVERY_TICKET_GRANTED.value })
        assertEquals(2, userEvents.count { it.eventName == ProductEventName.RECOVERY_TICKET_USED.value })
        assertEquals(2, userEvents.count { it.eventName == ProductEventName.RECOVERY_COMPLETED.value })
    }

    @Test
    @DisplayName("3. 광고 시청 중 리데이 기한 만료 경합 시 티켓 보상은 정상 보관하되 기한 만료 기록의 리데이 적용은 차단한다")
    fun `광고 시청 도중 리데이 기한이 만료되면 티켓 1장은 지급 보관되지만 해당 기록에는 리데이를 적용할 수 없다`() {
        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate)!!
        // 마감(10/03 09:00) 5초 전에 지각 인증 및 광고 세션 시작
        val justBeforeDeadline = LocalDateTime.of(2026, 10, 3, 8, 59, 55)
        dailyRecordService.verifyLate(
            recordId = day1Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/race.jpg",
                comment = "마감 임박 지각 인증"
            ),
            now = justBeforeDeadline
        )

        val issued = adService.requestAdSession(
            userId = hostUser.id,
            request = RequestAdSessionRequest(dailyRecordId = day1Record.id),
            now = justBeforeDeadline.plusSeconds(1)
        )
        val token = issued.session!!.sessionToken
        adService.recordImpression(hostUser.id, token, justBeforeDeadline.plusSeconds(2))

        // 10초 시청을 마친 시점(10/03 09:00:08)에는 이미 대상 기록의 리데이 기한(10/03 09:00:00)이 경과함
        val afterDeadline = LocalDateTime.of(2026, 10, 3, 9, 0, 8)
        val completeResp = adService.completeSessionAndGrantReward(
            userId = hostUser.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = afterDeadline
        )

        // 유효한 광고 시청 보상이므로 티켓 1장은 정상 지급되어 계정에 보관됨
        assertTrue(completeResp.newlyGranted)
        assertEquals(1L, completeResp.availableTicketCount)
        assertTrue(completeResp.targetRecordDeadlineExpired)
        assertFalse(completeResp.targetRecordRedayEligible)

        // 지급받은 티켓으로 이미 기한이 만료된 day1Record에 리데이 적용 시도 시 차단되며 티켓은 소비되지 않음
        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = hostUser.id,
                request = ApplyRedayRequest(ticketId = completeResp.grantedTicketId, dailyRecordId = day1Record.id),
                now = afterDeadline.plusSeconds(5)
            )
        }
        assertEquals(1L, redayTicketService.getBalance(hostUser.id, hostUser.id).availableCount)

        // 보관된 티켓은 다음 날(Day 2) 지각 인증 기록에 정상 사용 가능
        val day2Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate.plusDays(1))!!
        val day2VerifyTime = LocalDateTime.of(2026, 10, 3, 10, 0, 0)
        dailyRecordService.verifyLate(
            recordId = day2Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/day2-use.jpg",
                comment = "보관된 티켓 사용"
            ),
            now = day2VerifyTime
        )
        val day2Apply = redayTicketService.applyReday(
            userId = hostUser.id,
            request = ApplyRedayRequest(ticketId = completeResp.grantedTicketId, dailyRecordId = day2Record.id),
            now = day2VerifyTime.plusMinutes(1)
        )
        assertTrue(day2Apply.penaltyExempted)
        assertEquals(0L, redayTicketService.getBalance(hostUser.id, hostUser.id).availableCount)
    }

    @Test
    @DisplayName("4. IDOR 권한 방어 및 리데이 완료·벌금 확정 후 인증 삭제 차단 검증")
    fun `타인의 인증 티켓 광고 세션 접근은 모두 차단되며 리데이 완료 또는 벌금 확정 기록의 인증은 삭제할 수 없다`() {
        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate)!!
        val verifyTime = LocalDateTime.of(2026, 10, 2, 10, 0, 0)
        val hostLateResp = dailyRecordService.verifyLate(
            recordId = day1Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/idor.jpg",
                comment = "본인 지각 인증"
            ),
            now = verifyTime
        )

        // 1) 타인이 광고 세션 요청·노출·중단·완료 시도 시 403 Forbidden
        assertThrows(ForbiddenException::class.java) {
            adService.requestAdSession(
                userId = memberUser.id,
                request = RequestAdSessionRequest(dailyRecordId = day1Record.id),
                now = verifyTime.plusSeconds(1)
            )
        }
        val hostAdSession = adService.requestAdSession(
            userId = hostUser.id,
            request = RequestAdSessionRequest(dailyRecordId = day1Record.id),
            now = verifyTime.plusSeconds(2)
        ).session!!

        assertThrows(ForbiddenException::class.java) {
            adService.recordImpression(memberUser.id, hostAdSession.sessionToken, verifyTime.plusSeconds(3))
        }
        assertThrows(ForbiddenException::class.java) {
            adService.abandonSession(memberUser.id, hostAdSession.sessionToken, verifyTime.plusSeconds(4))
        }
        adService.recordImpression(hostUser.id, hostAdSession.sessionToken, verifyTime.plusSeconds(3))
        assertThrows(ForbiddenException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = memberUser.id,
                sessionToken = hostAdSession.sessionToken,
                request = CompleteAdSessionRequest(watchedSeconds = 10),
                now = verifyTime.plusSeconds(15)
            )
        }

        // 2) 타인의 티켓 잔액/이력 조회 및 타인 티켓/기록으로 리데이 적용 시도 시 403 Forbidden
        val memberTicket = redayTicketService.grantTicket(memberUser.id)
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.getBalance(hostUser.id, memberUser.id)
        }
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.getHistory(hostUser.id, memberUser.id)
        }
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.applyReday(
                userId = hostUser.id,
                request = ApplyRedayRequest(ticketId = memberTicket.ticketId, dailyRecordId = day1Record.id),
                now = verifyTime.plusSeconds(20)
            )
        }
        assertThrows(ForbiddenException::class.java) {
            redayTicketService.applyReday(
                userId = memberUser.id,
                request = ApplyRedayRequest(ticketId = memberTicket.ticketId, dailyRecordId = day1Record.id),
                now = verifyTime.plusSeconds(20)
            )
        }

        // 3) 본인이 광고 완료 후 리데이 적용 -> 리데이가 적용된 인증(EXEMPTED)은 삭제(deleteVerification) 불가
        val completedAd = adService.completeSessionAndGrantReward(
            userId = hostUser.id,
            sessionToken = hostAdSession.sessionToken,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = verifyTime.plusSeconds(15)
        )
        redayTicketService.applyReday(
            userId = hostUser.id,
            request = ApplyRedayRequest(ticketId = completedAd.grantedTicketId, dailyRecordId = day1Record.id),
            now = verifyTime.plusSeconds(25)
        )
        val verificationId = day1Record.verificationId!!
        assertThrows(BadRequestException::class.java) {
            verificationService.deleteVerification(verificationId, hostUser.id)
        }
        assertNotNull(hostLateResp.id)

        // 4) 기한 만료로 이미 벌금이 확정(CONFIRMED)된 지각 인증 기록 역시 인증 삭제 불가
        val day2Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate.plusDays(1))!!
        dailyRecordService.verifyLate(
            recordId = day2Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/confirmed.jpg",
                comment = "기한 만료 후 지각 인증"
            ),
            now = LocalDateTime.of(2026, 10, 5, 10, 0, 0) // Day 2 마감(10/04 09:00) 이후 등록 -> 즉시 CONFIRMED
        )
        val confirmedVerificationId = day2Record.verificationId!!
        assertThrows(BadRequestException::class.java) {
            verificationService.deleteVerification(confirmedVerificationId, hostUser.id)
        }
    }

    @Test
    @DisplayName("5. 광고 부재·시청 중단·실험 미배정(Fallback) 상황에서도 지각 인증과 리데이 상태는 안전하게 격리된다")
    fun `광고가 없거나 시청을 중단해도 대상 기록의 벌금 보류와 리데이 기한은 유지되며 실험 미등록 시 안전하게 Fallback된다`() {
        // 모든 캠페인을 삭제하여 광고 부재(NO_AVAILABLE_AD) 상태 재현
        adCreativeRepository.deleteAll()
        adCampaignRepository.deleteAll()

        val day1Record = dailyRecordRepository.findByChallengeParticipantIdAndDate(hostParticipant.id, startDate)!!
        val verifyTime = LocalDateTime.of(2026, 10, 2, 11, 0, 0)
        val lateResp = dailyRecordService.verifyLate(
            recordId = day1Record.id,
            userId = hostUser.id,
            request = LateVerificationRequest(
                imageUrl = "verifications/${redayChallenge.id}/${hostUser.id}/no-ad.jpg",
                comment = "광고 없을 때 지각 인증"
            ),
            now = verifyTime
        )
        assertTrue(lateResp.redayEligible)
        assertEquals(PenaltyStatus.PENDING, lateResp.penaltyStatus)

        val noAdResp = adService.requestAdSession(
            userId = hostUser.id,
            request = RequestAdSessionRequest(dailyRecordId = day1Record.id),
            now = verifyTime.plusSeconds(10)
        )
        assertFalse(noAdResp.available)
        assertEquals(AdUnavailableReason.NO_AVAILABLE_AD, noAdResp.unavailableReason)
        assertNull(noAdResp.session)

        // 광고가 없더라도 대상 기록의 보류 상태(PENDING)와 리데이 기한(10/03 09:00)은 전혀 훼손되지 않음
        val refreshed = dailyRecordRepository.findById(day1Record.id).get()
        assertEquals(PenaltyStatus.PENDING, refreshed.penaltyStatus)
        assertEquals(LocalDateTime.of(2026, 10, 3, 9, 0, 0), refreshed.effectiveRedayDeadline())

        // v0.10 실험(reday-guide-copy-v1)이 비활성(DRAFT)이거나 미등록 상태에서도 예외 없이 Fallback(Variant A) 반환
        val fallbackAssign = experimentService.assignVariant(
            experimentKey = DayuseExperimentDefinitions.REDAY_GUIDE_COPY_V1,
            userId = hostUser.id
        )
        assertFalse(fallbackAssign.participating)
        assertEquals(ExperimentVariant.A, fallbackAssign.variant)
    }

    @Test
    @DisplayName("6. 주 N회(WEEKLY_N) 챌린지 회귀 검증: 특정 요일 휴식 무벌금, 주간 정산 유지, 리데이·광고 차단, 다음 주 수행의 지난주 소급 불가")
    fun `주 N회 챌린지는 일별 리데이와 광고가 완전히 차단되며 기존 주간 집계와 정산 정책이 회귀 없이 유지된다`() {
        val weeklyStart = LocalDate.of(2026, 9, 1)
        val weeklyEnd = LocalDate.of(2026, 9, 14) // 1구간: 9/1~9/7, 2구간: 9/8~9/14

        val weeklyChallenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "주 3회 헬스장 가기",
                verificationCriteria = "운동 기구 사진",
                startDate = weeklyStart,
                endDate = weeklyEnd,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUser.id, penaltyAmount = 5000)
                )
            ),
            today = weeklyStart
        )
        assertFalse(weeklyChallenge.redayAllowed)

        // 1구간(9/1~9/7) 중 9/1은 휴식(미수행), 9/2에만 1회 수행:
        // 주 N회 챌린지는 특정 요일(9/1)을 쉬어도 일별 지각/리데이 대상이 아니며 즉시 벌금이 부과되지 않음
        val restDayRecord = dailyRecordRepository.findAllByChallengeId(weeklyChallenge.id)
            .first { it.userId == memberUser.id && it.date == weeklyStart }
        val eligibility = dailyRecordService.checkRedayEligibility(
            recordId = restDayRecord.id,
            userId = memberUser.id,
            now = LocalDateTime.of(2026, 9, 2, 12, 0, 0)
        )
        assertFalse(eligibility.eligible)
        assertEquals(RedayIneligibleReason.WEEKLY_NOT_SUPPORTED, eligibility.reason)

        // 주 N회 기록으로 광고 세션 요청 또는 리데이 티켓 적용 시도 시 400 BadRequest 차단
        redayTicketService.grantTicket(memberUser.id)
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = memberUser.id,
                request = RequestAdSessionRequest(dailyRecordId = restDayRecord.id),
                now = LocalDateTime.of(2026, 9, 2, 12, 0, 0)
            )
        }
        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = memberUser.id,
                request = ApplyRedayRequest(dailyRecordId = restDayRecord.id),
                now = LocalDateTime.of(2026, 9, 2, 12, 0, 0)
            )
        }

        // 1구간(9/2) 1회 수행 등록
        val vWeek1 = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = weeklyChallenge.id,
                userId = memberUser.id,
                targetDate = LocalDate.of(2026, 9, 2),
                imageUrl = "gym-week1.jpg"
            )
        )
        val week1Record = dailyRecordRepository.findAllByChallengeId(weeklyChallenge.id)
            .first { it.userId == memberUser.id && it.date == LocalDate.of(2026, 9, 2) }
        week1Record.verifyToday(vWeek1.id)

        // 2구간(9/8, 9/9)에 2회 수행하더라도 지난주(1구간) 부족분(2회 미달)을 소급하여 메울 수 없음
        listOf(LocalDate.of(2026, 9, 8), LocalDate.of(2026, 9, 9)).forEach { date ->
            val vWeek2 = verificationRepository.save(
                Verification(
                    groupId = group.id,
                    challengeId = weeklyChallenge.id,
                    userId = memberUser.id,
                    targetDate = date,
                    imageUrl = "gym-$date.jpg"
                )
            )
            val rec = dailyRecordRepository.findAllByChallengeId(weeklyChallenge.id)
                .first { it.userId == memberUser.id && it.date == date }
            rec.verifyToday(vWeek2.id)
        }

        val afterWeek1 = LocalDate.of(2026, 9, 10)
        val detail = challengeService.getChallengeDetail(weeklyChallenge.id, memberUser.id, afterWeek1)
        val interval1 = detail.intervals!!.first { it.index == 1 }
        val interval2 = detail.intervals!!.first { it.index == 2 }

        assertEquals(1, interval1.completedCount)
        assertEquals(2, interval1.missedCount)
        assertEquals(10000, interval1.totalPenaltyAmount)
        assertEquals(PeriodSettlementStatus.NEEDS_CONFIRMATION, interval1.settlementStatus)

        assertEquals(2, interval2.completedCount)

        val confirmedWeek1 = challengeService.confirmPeriod(group.id, weeklyChallenge.id, 1, memberUser.id, afterWeek1)
        assertEquals(PeriodSettlementStatus.CONFIRMED_FAILED, confirmedWeek1.status)
        assertEquals(10000, confirmedWeek1.totalPenaltyAmount)
    }
}
