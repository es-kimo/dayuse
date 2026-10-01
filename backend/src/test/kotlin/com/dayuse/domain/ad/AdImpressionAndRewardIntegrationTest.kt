@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.ad

import com.dayuse.domain.ad.dto.CompleteAdSessionRequest
import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.dto.RequestAdSessionRequest
import com.dayuse.domain.ad.service.AdService
import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.service.RedayTicketService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdImpressionAndRewardIntegrationTest {

    @Autowired private lateinit var mockMvc: MockMvc
    @Autowired private lateinit var objectMapper: ObjectMapper
    @Autowired private lateinit var userRepository: UserRepository
    @Autowired private lateinit var groupRepository: GroupRepository
    @Autowired private lateinit var groupMemberRepository: GroupMemberRepository
    @Autowired private lateinit var challengeRepository: ChallengeRepository
    @Autowired private lateinit var challengeParticipantRepository: ChallengeParticipantRepository
    @Autowired private lateinit var dailyRecordRepository: DailyRecordRepository
    @Autowired private lateinit var verificationRepository: VerificationRepository
    @Autowired private lateinit var redayTicketRepository: RedayTicketRepository
    @Autowired private lateinit var redayTicketService: RedayTicketService
    @Autowired private lateinit var adCampaignRepository: AdCampaignRepository
    @Autowired private lateinit var adCreativeRepository: AdCreativeRepository
    @Autowired private lateinit var adSessionRepository: AdSessionRepository
    @Autowired private lateinit var adRewardHistoryRepository: AdRewardHistoryRepository
    @Autowired private lateinit var adService: AdService
    @Autowired private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var ownerUser: User
    private lateinit var otherUser: User
    private lateinit var ownerToken: String
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var ownerParticipant: ChallengeParticipant
    private lateinit var defaultCampaign: AdCampaign

    private val baseDate = LocalDate.of(2026, 10, 1)
    private val validNow = LocalDateTime.of(2026, 10, 2, 14, 0)

    @BeforeEach
    fun setUp() {
        adRewardHistoryRepository.deleteAll()
        adSessionRepository.deleteAll()
        adCreativeRepository.deleteAll()
        adCampaignRepository.deleteAll()

        ownerUser = userRepository.save(
            User(
                kakaoId = "kakao-f09-owner-${System.nanoTime()}",
                nickname = "광고시청유저"
            )
        )
        otherUser = userRepository.save(
            User(
                kakaoId = "kakao-f09-other-${System.nanoTime()}",
                nickname = "다른유저"
            )
        )
        ownerToken = jwtTokenProvider.generateAccessToken(ownerUser.id)

        group = groupRepository.save(
            Group(
                name = "광고 보상 테스트 모임",
                hostUserId = ownerUser.id,
                inviteCode = "RW${System.nanoTime().toString().takeLast(6)}"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = ownerUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = otherUser.id, role = GroupRole.MEMBER))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "매일 미라클 모닝",
                verificationCriteria = "기상 인증",
                startDate = baseDate.minusDays(5),
                endDate = baseDate.plusDays(10),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL,
                redayAllowed = true
            )
        )
        ownerParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = ownerUser.id,
                startDate = challenge.startDate,
                penaltyAmount = 3000
            )
        )

        val created = adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "reward-test-campaign",
                title = "보상 지급 테스트 캠페인",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 10,
                dailyImpressionLimit = 3,
                startAt = validNow.minusDays(10),
                endAt = validNow.plusDays(10),
                creatives = listOf(
                    CreateAdCreativeInput(
                        title = "리데이 안내 소재",
                        description = "10초 동안 안내를 시청하면 리데이 티켓 1장을 드립니다.",
                        minWatchSeconds = 10,
                        active = true
                    )
                )
            )
        )
        defaultCampaign = adCampaignRepository.findById(created.id).orElseThrow()
    }

    private fun createEligibleLateRecord(
        targetDate: LocalDate = baseDate,
        submittedAt: LocalDateTime = validNow
    ): DailyRecord {
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = ownerUser.id,
                targetDate = targetDate,
                imageUrl = "https://example.com/late-${targetDate}.jpg",
                isLate = true
            )
        )
        val record = DailyRecord(
            groupId = group.id,
            challengeId = challenge.id,
            challengeParticipantId = ownerParticipant.id,
            userId = ownerUser.id,
            date = targetDate,
            status = DailyRecordStatus.UNCHECKED
        )
        record.verifyLate(
            verificationId = verification.id,
            isLate = true,
            today = targetDate.plusDays(1),
            redayAllowed = true,
            penaltyAmountForOverdue = 3000,
            submittedAt = submittedAt
        )
        return dailyRecordRepository.save(record)
    }

    // ── 1. 최초 노출(impression) 기록 및 중복 노출 집계 방지 ─────────────

    @Test
    fun `광고 세션 최초 노출만 기록하며 반복 노출 요청 시 최초 노출 시각을 유지하고 중복 집계하지 않는다`() {
        val record = createEligibleLateRecord()
        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = validNow
        )
        val token = issued.session!!.sessionToken

        val firstImpTime = validNow.plusSeconds(2)
        val firstImp = adService.recordImpression(
            userId = ownerUser.id,
            sessionToken = token,
            now = firstImpTime
        )
        assertTrue(firstImp.firstImpression)
        assertEquals(AdSessionStatus.IMPRESSED, firstImp.status)
        assertEquals(firstImpTime, firstImp.impressionAt)

        // 5초 뒤 중복 호출해도 최초 노출 시각(firstImpTime)이 그대로 유지되어야 함
        val secondImp = adService.recordImpression(
            userId = ownerUser.id,
            sessionToken = token,
            now = firstImpTime.plusSeconds(5)
        )
        assertFalse(secondImp.firstImpression)
        assertEquals(firstImpTime, secondImp.impressionAt)

        val todayStart = validNow.toLocalDate().atStartOfDay()
        val count = adSessionRepository.countActualImpressionsByCampaignAndUserBetween(
            campaignId = defaultCampaign.id,
            userId = ownerUser.id,
            startOfDay = todayStart,
            endOfDay = todayStart.plusDays(1)
        )
        assertEquals(1L, count)
    }

    // ── 2. 타인 세션 접근 차단 (IDOR 방어) ──────────────────────────────

    @Test
    fun `타인의 광고 세션에 노출이나 중단 또는 완료 요청을 보내면 403 Forbidden으로 차단한다`() {
        val record = createEligibleLateRecord()
        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = validNow
        )
        val token = issued.session!!.sessionToken

        assertThrows(ForbiddenException::class.java) {
            adService.recordImpression(otherUser.id, token, validNow.plusSeconds(1))
        }
        assertThrows(ForbiddenException::class.java) {
            adService.abandonSession(otherUser.id, token, validNow.plusSeconds(2))
        }
        assertThrows(ForbiddenException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = otherUser.id,
                sessionToken = token,
                now = validNow.plusSeconds(15)
            )
        }
    }

    // ── 3. 미노출·최소 시청 시간 미달·중단·만료 세션 완료 차단 (F09) ──────

    @Test
    fun `실제 노출 기록이 없거나 최소 시청 시간(10초) 미달 시 완료 요청을 차단하고 티켓을 지급하지 않는다`() {
        val record = createEligibleLateRecord()
        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = validNow
        )
        val token = issued.session!!.sessionToken

        // 1) 미노출 상태에서 바로 완료 요청 → 차단
        assertThrows(BadRequestException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = ownerUser.id,
                sessionToken = token,
                now = validNow.plusSeconds(15)
            )
        }
        assertEquals(0L, redayTicketRepository.countByUserIdAndStatus(ownerUser.id, RedayTicketStatus.AVAILABLE))

        // 2) 노출 기록 후 서버 경과 시간 9초(10초 미달) 시점 완료 요청 → 차단
        val impTime = validNow.plusSeconds(1)
        adService.recordImpression(ownerUser.id, token, impTime)

        assertThrows(BadRequestException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = ownerUser.id,
                sessionToken = token,
                now = impTime.plusSeconds(9)
            )
        }

        // 3) 서버 시간은 12초 지났으나 클라이언트가 보고한 실제 시청 시간(watchedSeconds=6)이 미달인 경우 → 차단
        assertThrows(BadRequestException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = ownerUser.id,
                sessionToken = token,
                request = CompleteAdSessionRequest(watchedSeconds = 6),
                now = impTime.plusSeconds(12)
            )
        }
        assertEquals(0L, redayTicketRepository.countByUserIdAndStatus(ownerUser.id, RedayTicketStatus.AVAILABLE))
    }

    @Test
    fun `시청 중단(ABANDONED)되었거나 유효기간(10분)이 만료된 세션은 신규 완료 처리할 수 없다`() {
        val record = createEligibleLateRecord()

        // 1) 시청 중단 후 완료 시도 차단
        val issued1 = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = validNow
        )
        val token1 = issued1.session!!.sessionToken
        adService.recordImpression(ownerUser.id, token1, validNow.plusSeconds(1))
        adService.abandonSession(ownerUser.id, token1, validNow.plusSeconds(5))

        assertThrows(BadRequestException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = ownerUser.id,
                sessionToken = token1,
                now = validNow.plusSeconds(20)
            )
        }

        // 2) 새 세션 발급 및 노출 후 10분 유효기간 경과 뒤 완료 시도 차단
        val issued2Time = validNow.plusMinutes(1)
        val issued2 = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = issued2Time
        )
        val token2 = issued2.session!!.sessionToken
        adService.recordImpression(ownerUser.id, token2, issued2Time.plusSeconds(2))

        assertThrows(BadRequestException::class.java) {
            adService.completeSessionAndGrantReward(
                userId = ownerUser.id,
                sessionToken = token2,
                now = issued2Time.plusMinutes(10) // 정확히 만료 시각
            )
        }
        assertEquals(0L, redayTicketRepository.countByUserIdAndStatus(ownerUser.id, RedayTicketStatus.AVAILABLE))
    }

    // ── 4. 정상 완료 보상 지급, 자동 소비 금지, 반복/만료 후 재시도 멱등성 (F10) ──

    @Test
    fun `정상 시청 완료 시 리데이 티켓 1장만 지급하며 만료 후 재요청해도 중복 발급 없이 기존 지급 결과를 반환한다`() {
        val record = createEligibleLateRecord()
        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = validNow
        )
        val token = issued.session!!.sessionToken

        val impTime = validNow.plusSeconds(1)
        adService.recordImpression(ownerUser.id, token, impTime)

        val completeTime = impTime.plusSeconds(10)
        val firstComplete = adService.completeSessionAndGrantReward(
            userId = ownerUser.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = completeTime
        )

        assertTrue(firstComplete.newlyGranted)
        assertEquals(AdSessionStatus.COMPLETED, firstComplete.status)
        assertEquals(1L, firstComplete.availableTicketCount)
        assertTrue(firstComplete.targetRecordRedayEligible)
        assertFalse(firstComplete.targetRecordDeadlineExpired)

        // 중요: 광고 시청 완료만으로는 벌금이 자동 면제되지 않고 티켓도 자동 소비되지 않아야 함!
        val recordAfterAd = dailyRecordRepository.findById(record.id).orElseThrow()
        assertFalse(recordAfterAd.redayApplied)
        assertEquals(PenaltyStatus.PENDING, recordAfterAd.penaltyStatus)
        assertEquals(3000, recordAfterAd.penaltyAmount)

        // 동일 세션에 즉시 중복 완료 요청 → 추가 티켓 발급 없이 동일 결과 반환 (newlyGranted = false)
        val duplicateComplete = adService.completeSessionAndGrantReward(
            userId = ownerUser.id,
            sessionToken = token,
            now = completeTime.plusSeconds(2)
        )
        assertFalse(duplicateComplete.newlyGranted)
        assertEquals(firstComplete.grantedTicketId, duplicateComplete.grantedTicketId)
        assertEquals(firstComplete.rewardHistoryId, duplicateComplete.rewardHistoryId)
        assertEquals(1L, duplicateComplete.availableTicketCount)

        // 세션 유효기간(10분)이 한참 지난 30분 뒤 재시도하더라도 에러 없이 기존 지급 결과를 그대로 반환해야 함!
        val retryAfterExpiry = adService.completeSessionAndGrantReward(
            userId = ownerUser.id,
            sessionToken = token,
            now = validNow.plusMinutes(30)
        )
        assertFalse(retryAfterExpiry.newlyGranted)
        assertEquals(firstComplete.grantedTicketId, retryAfterExpiry.grantedTicketId)
        assertEquals(firstComplete.rewardHistoryId, retryAfterExpiry.rewardHistoryId)
        assertEquals(
            1L,
            redayTicketRepository.countBySourceAndSourceReference(RedayTicketSource.REWARD_AD, token)
        )
        assertEquals(1L, adRewardHistoryRepository.countBySessionId(issued.session!!.sessionId))
    }

    // ── 5. 광고 시청 도중 대상 인증 기록의 리데이 기한 만료 시 분리 처리 (F10) ──

    @Test
    fun `광고 시청 도중 대상 지각 기록의 리데이 기한이 만료되더라도 리데이 티켓 1장은 정상 지급하고 해당 기록 적용만 차단한다`() {
        // 대상일(10/1)의 리데이 기한은 10/3 09:00:00
        // 마감 5초 전(10/3 08:59:55)에 지각 인증 및 광고 세션 발급·노출
        val justBeforeDeadline = LocalDateTime.of(2026, 10, 3, 8, 59, 55)
        val expiringRecord = createEligibleLateRecord(
            targetDate = baseDate,
            submittedAt = justBeforeDeadline.minusMinutes(1)
        )

        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = expiringRecord.id),
            now = justBeforeDeadline
        )
        val token = issued.session!!.sessionToken
        adService.recordImpression(ownerUser.id, token, justBeforeDeadline.plusSeconds(1))

        // 11초 시청 후 완료 시점: 10/3 09:00:07 (이미 대상 기록의 리데이 기한 09:00:00 경과!)
        val completedAfterRecordDeadline = LocalDateTime.of(2026, 10, 3, 9, 0, 7)
        val completeRes = adService.completeSessionAndGrantReward(
            userId = ownerUser.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 11),
            now = completedAfterRecordDeadline
        )

        // 1) 유효한 광고 세션의 시청 완료 보상(리데이 티켓 1장)은 정상 지급되어야 함
        assertTrue(completeRes.newlyGranted)
        assertEquals(1L, completeRes.availableTicketCount)
        assertTrue(completeRes.targetRecordDeadlineExpired)
        assertFalse(completeRes.targetRecordRedayEligible)

        // 2) 지급된 티켓으로 기한 만료된 해당 기록(10/1)에 리데이 적용을 시도하면 차단되어야 함
        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                userId = ownerUser.id,
                request = ApplyRedayRequest(
                    dailyRecordId = expiringRecord.id,
                    ticketId = completeRes.grantedTicketId
                ),
                now = completedAfterRecordDeadline
            )
        }

        // 3) 티켓은 소비되지 않고 계정에 그대로 남아 다른 적격 지각 기록(10/2)에 사용할 수 있어야 함
        val anotherEligibleRecord = createEligibleLateRecord(
            targetDate = baseDate.plusDays(1),
            submittedAt = completedAfterRecordDeadline
        )
        val applyRes = redayTicketService.applyReday(
            userId = ownerUser.id,
            request = ApplyRedayRequest(
                dailyRecordId = anotherEligibleRecord.id,
                ticketId = completeRes.grantedTicketId
            ),
            now = completedAfterRecordDeadline
        )
        assertTrue(applyRes.penaltyExempted)
        assertEquals(0L, redayTicketRepository.countByUserIdAndStatus(ownerUser.id, RedayTicketStatus.AVAILABLE))
    }

    // ── 6. REST API 엔드포인트 통합 검증 ────────────────────────────────

    @Test
    fun `노출 기록 후 시청 중단 API 호출 시 ABANDONED 상태로 전환된다`() {
        val nowKst = DateTimeUtils.nowKst()
        val targetDate = nowKst.toLocalDate().minusDays(1)

        adService.updateCampaign(
            campaignId = defaultCampaign.id,
            request = com.dayuse.domain.ad.dto.UpdateAdCampaignRequest(
                startAt = nowKst.minusDays(2),
                endAt = nowKst.plusDays(2)
            )
        )

        val challengeNow = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "실시간 광고 API 챌린지",
                verificationCriteria = "사진",
                startDate = targetDate.minusDays(3),
                endDate = targetDate.plusDays(5),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL,
                redayAllowed = true
            )
        )
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challengeNow.id,
                userId = ownerUser.id,
                targetDate = targetDate,
                imageUrl = "https://example.com/api-now.jpg",
                isLate = true
            )
        )
        val recordNow = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challengeNow.id,
                challengeParticipantId = ownerParticipant.id,
                userId = ownerUser.id,
                date = targetDate,
                status = DailyRecordStatus.COMPLETED,
                verificationId = verification.id,
                isLate = true,
                penaltyAmount = 3000,
                penaltyStatus = PenaltyStatus.PENDING,
                redayDeadline = nowKst.plusHours(6)
            )
        )

        val issued = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = recordNow.id),
            now = nowKst
        )
        val sessionToken = issued.session!!.sessionToken

        mockMvc.post("/api/v1/ads/sessions/$sessionToken/impression") {
            header("Authorization", "Bearer $ownerToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("IMPRESSED") }
            jsonPath("$.firstImpression") { value(true) }
        }

        mockMvc.post("/api/v1/ads/sessions/$sessionToken/abandon") {
            header("Authorization", "Bearer $ownerToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("ABANDONED") }
        }
    }
}
