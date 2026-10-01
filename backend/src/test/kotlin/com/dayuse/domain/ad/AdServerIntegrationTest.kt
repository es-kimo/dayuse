@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.ad

import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.dto.RequestAdSessionRequest
import com.dayuse.domain.ad.dto.UpdateAdCampaignRequest
import com.dayuse.domain.ad.dto.UpdateAdCreativeRequest
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
import com.dayuse.domain.redayticket.RedayTicket
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.jwt.JwtTokenProvider
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
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdServerIntegrationTest {

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
    @Autowired private lateinit var adCampaignRepository: AdCampaignRepository
    @Autowired private lateinit var adCreativeRepository: AdCreativeRepository
    @Autowired private lateinit var adSessionRepository: AdSessionRepository
    @Autowired private lateinit var adService: AdService
    @Autowired private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var ownerUser: User
    private lateinit var otherUser: User
    private lateinit var ownerToken: String
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var ownerParticipant: ChallengeParticipant
    private lateinit var defaultCampaign: AdCampaign
    private lateinit var defaultCreative: AdCreative

    private val baseDate = LocalDate.of(2026, 10, 1)
    // 대상일(10/1)의 지각 인증 가능 및 리데이 가능 시각: 10/2 14:00 (기한은 10/3 09:00)
    private val validNow = LocalDateTime.of(2026, 10, 2, 14, 0)

    @BeforeEach
    fun setUp() {
        adSessionRepository.deleteAll()
        adCreativeRepository.deleteAll()
        adCampaignRepository.deleteAll()

        ownerUser = userRepository.save(
            User(
                kakaoId = "kakao-ad-owner-${System.nanoTime()}",
                nickname = "광고적격유저"
            )
        )
        otherUser = userRepository.save(
            User(
                kakaoId = "kakao-ad-other-${System.nanoTime()}",
                nickname = "타인유저"
            )
        )
        ownerToken = jwtTokenProvider.generateAccessToken(ownerUser.id)

        group = groupRepository.save(
            Group(
                name = "자체 광고 테스트 모임",
                hostUserId = ownerUser.id,
                inviteCode = "AD${System.nanoTime().toString().takeLast(6)}"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = ownerUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = otherUser.id, role = GroupRole.MEMBER))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "매일 독서 챌린지",
                verificationCriteria = "책 사진",
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
                campaignKey = "test-default-campaign",
                title = "기본 자체 안내 캠페인",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 10,
                dailyImpressionLimit = 3,
                startAt = validNow.minusDays(5),
                endAt = validNow.plusDays(5),
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
        defaultCreative = adCreativeRepository.findById(created.creatives.first().id).orElseThrow()
    }

    private fun createEligibleLateRecord(
        userId: Long = ownerUser.id,
        targetChallenge: Challenge = challenge,
        targetDate: LocalDate = baseDate
    ): DailyRecord {
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = targetChallenge.id,
                userId = userId,
                targetDate = targetDate,
                imageUrl = "https://example.com/late.jpg",
                isLate = true
            )
        )
        val record = DailyRecord(
            groupId = group.id,
            challengeId = targetChallenge.id,
            challengeParticipantId = ownerParticipant.id,
            userId = userId,
            date = targetDate,
            status = DailyRecordStatus.UNCHECKED
        )
        record.verifyLate(
            verificationId = verification.id,
            isLate = true,
            today = targetDate.plusDays(1),
            redayAllowed = targetChallenge.isRedayActive(),
            penaltyAmountForOverdue = 3000,
            submittedAt = validNow
        )
        return dailyRecordRepository.save(record)
    }

    // ── 1. 적격 사용자 광고 세션 정상 발급 및 스냅샷 불변성 ────────────

    @Test
    fun `적격 사용자가 광고 요청 시 10분 유효기간과 10초 최소 시청시간이 스냅샷된 세션이 발급된다`() {
        val lateRecord = createEligibleLateRecord()

        val response = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = validNow
        )

        assertTrue(response.available)
        assertNull(response.unavailableReason)
        val sessionDto = response.session
        assertNotNull(sessionDto)
        assertEquals(AdSessionStatus.ISSUED, sessionDto!!.status)
        assertEquals(10, sessionDto.requiredWatchSeconds)
        assertEquals(validNow, sessionDto.issuedAt)
        assertEquals(validNow.plusMinutes(10), sessionDto.expiresAt)
        assertEquals(AdCreative.REQUIRED_BADGE_TEXT, sessionDto.creative.badgeText)

        // 발급 이후 소재의 최소 시청 시간을 25초로 변경하더라도 이미 발급된 세션의 스냅샷 조건은 10초로 유지되어야 함
        adService.updateCreative(
            creativeId = defaultCreative.id,
            request = UpdateAdCreativeRequest(minWatchSeconds = 25)
        )
        val persistedSession = adSessionRepository.findById(sessionDto.sessionId).orElseThrow()
        assertEquals(10, persistedSession.requiredWatchSeconds)
        assertEquals(validNow.plusMinutes(10), persistedSession.expiresAt)
    }

    // ── 2. 비적격 요청 차단 (IDOR, 보유 티켓 존재, 주 N회, 기한 만료, 단일 세션 제한) ──

    @Test
    fun `타인의 지각 인증 기록으로 광고 세션을 요청하면 403 Forbidden으로 차단된다`() {
        val otherParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = otherUser.id,
                startDate = challenge.startDate,
                penaltyAmount = 3000
            )
        )
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = otherUser.id,
                targetDate = baseDate,
                imageUrl = "https://example.com/other.jpg",
                isLate = true
            )
        )
        val otherRecord = DailyRecord(
            groupId = group.id,
            challengeId = challenge.id,
            challengeParticipantId = otherParticipant.id,
            userId = otherUser.id,
            date = baseDate,
            status = DailyRecordStatus.UNCHECKED
        ).apply {
            verifyLate(
                verificationId = verification.id,
                isLate = true,
                today = baseDate.plusDays(1),
                redayAllowed = true,
                penaltyAmountForOverdue = 3000,
                submittedAt = validNow
            )
        }
        dailyRecordRepository.save(otherRecord)

        assertThrows(ForbiddenException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = otherRecord.id),
                now = validNow
            )
        }
    }

    @Test
    fun `보유 중인 사용 가능 리데이 티켓이 있으면 광고 세션을 발급하지 않고 차단한다`() {
        val lateRecord = createEligibleLateRecord()
        redayTicketRepository.save(
            RedayTicket(
                userId = ownerUser.id,
                status = RedayTicketStatus.AVAILABLE,
                source = RedayTicketSource.WELCOME_BONUS
            )
        )

        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
                now = validNow
            )
        }
    }

    @Test
    fun `주 N회 챌린지 기록이나 미인증 기록, 기한 만료 기록으로 광고 세션을 요청하면 차단한다`() {
        // 1) 주 N회 챌린지
        val weeklyChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "주 3회 운동",
                verificationCriteria = "운동 사진",
                startDate = baseDate.minusDays(5),
                endDate = baseDate.plusDays(10),
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3,
                executionType = ExecutionType.INDIVIDUAL,
                redayAllowed = false
            )
        )
        val weeklyParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = weeklyChallenge.id,
                userId = ownerUser.id,
                startDate = weeklyChallenge.startDate,
                penaltyAmount = 3000
            )
        )
        val weeklyRecord = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = weeklyChallenge.id,
                challengeParticipantId = weeklyParticipant.id,
                userId = ownerUser.id,
                date = baseDate,
                status = DailyRecordStatus.COMPLETED,
                verificationId = 999L,
                isLate = true,
                penaltyAmount = 3000,
                penaltyStatus = PenaltyStatus.PENDING
            )
        )
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = weeklyRecord.id),
                now = validNow
            )
        }

        // 2) 지각 인증을 아직 등록하지 않은 FAILED 기록
        val unverifiedRecord = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = ownerParticipant.id,
                userId = ownerUser.id,
                date = baseDate.minusDays(1),
                status = DailyRecordStatus.UNCHECKED
            ).apply {
                markFailed(
                    penalty = 3000,
                    today = baseDate,
                    redayAllowed = true,
                    now = baseDate.atTime(10, 0)
                )
            }
        )
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = unverifiedRecord.id),
                now = validNow
            )
        }

        // 3) 리데이 기한(대상일 + 2일 09:00)이 지난 기록
        val lateRecord = createEligibleLateRecord(targetDate = baseDate)
        val expiredNow = baseDate.plusDays(2).atTime(9, 0) // 정확히 이틀 뒤 09:00
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
                now = expiredNow
            )
        }
    }

    @Test
    fun `계정당 진행 중인 활성 세션은 하나로 제한되며 만료 후에는 재발급이 가능하다`() {
        val lateRecord = createEligibleLateRecord()

        // 첫 번째 세션 정상 발급
        val first = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = validNow
        )
        assertTrue(first.available)

        // 5분 뒤(아직 10분 만료 전) 다시 요청하면 차단되어야 함
        assertThrows(BadRequestException::class.java) {
            adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
                now = validNow.plusMinutes(5)
            )
        }

        // 10분 뒤(만료 시각 도달) 요청하면 기존 세션은 EXPIRED로 전환되고 새 세션이 발급되어야 함
        val second = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = validNow.plusMinutes(10)
        )
        assertTrue(second.available)
        val firstEntity = adSessionRepository.findById(first.session!!.sessionId).orElseThrow()
        assertEquals(AdSessionStatus.EXPIRED, firstEntity.status)
    }

    // ── 3. 캠페인 선택 규칙 (상태·기간·우선순위·실제 노출 상한) 및 불가 사유 ──

    @Test
    fun `활성 상태 및 운영 기간 내 캠페인 중 우선순위가 높은 캠페인을 먼저 선택한다`() {
        val lateRecord = createEligibleLateRecord()

        // 우선순위가 더 높지만 PAUSED인 캠페인
        adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "paused-high-priority",
                title = "중지된 고우선순위 캠페인",
                status = AdCampaignStatus.PAUSED,
                priority = 100,
                dailyImpressionLimit = 3,
                startAt = validNow.minusDays(1),
                endAt = validNow.plusDays(1),
                creatives = listOf(CreateAdCreativeInput(title = "중지 소재", description = "설명"))
            )
        )

        // 우선순위가 더 높지만 기간 만료된 캠페인
        adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "expired-high-priority",
                title = "기간 만료된 고우선순위 캠페인",
                status = AdCampaignStatus.ACTIVE,
                priority = 90,
                dailyImpressionLimit = 3,
                startAt = validNow.minusDays(5),
                endAt = validNow.minusHours(1),
                creatives = listOf(CreateAdCreativeInput(title = "만료 소재", description = "설명"))
            )
        )

        // 우선순위가 50이고 ACTIVE + 운영 기간 내인 캠페인
        val activeHigh = adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "active-priority-50",
                title = "활성 고우선순위 캠페인",
                status = AdCampaignStatus.ACTIVE,
                priority = 50,
                dailyImpressionLimit = 3,
                startAt = validNow.minusDays(1),
                endAt = validNow.plusDays(1),
                creatives = listOf(CreateAdCreativeInput(title = "우선순위 50 소재", description = "설명"))
            )
        )

        val response = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = validNow
        )

        assertTrue(response.available)
        assertEquals(activeHigh.id, response.session!!.campaignId)
        assertEquals("우선순위 50 소재", response.session!!.creative.title)
    }

    @Test
    fun `일일 노출 상한은 단순 세션 발급(served)이 아니라 실제 노출(impression) 기준으로 집계하며 상한 도달 시 DAILY_LIMIT_REACHED를 반환한다`() {
        val lateRecord = createEligibleLateRecord()

        // 1) 3번 발급받았으나 실제 노출(impressionAt) 없이 만료된 경우 → 상한(3회) 차감 안 됨!
        for (i in 0 until 3) {
            val issuedTime = validNow.plusMinutes(i * 11L)
            val res = adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
                now = issuedTime
            )
            assertTrue(res.available)
        }

        // 4번째 요청도 실제 노출이 0회이므로 정상 발급되어야 함
        val fourthTime = validNow.plusMinutes(33)
        val fourth = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = fourthTime
        )
        assertTrue(fourth.available)

        // 2) 이제 당일 실제 노출(impressionAt != null)이 3회 발생한 상황을 기록 (유효기간 내 노출 기록 후 중단)
        adService.recordImpression(ownerUser.id, fourth.session!!.sessionToken, fourthTime.plusSeconds(1))
        adService.abandonSession(ownerUser.id, fourth.session!!.sessionToken, fourthTime.plusSeconds(3))

        for (j in 1..2) {
            val t = fourthTime.plusMinutes(j.toLong())
            val issued = adService.requestAdSession(
                userId = ownerUser.id,
                request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
                now = t
            )
            assertTrue(issued.available)
            adService.recordImpression(ownerUser.id, issued.session!!.sessionToken, t.plusSeconds(1))
            adService.abandonSession(ownerUser.id, issued.session!!.sessionToken, t.plusSeconds(3))
        }

        // 이제 당일 실제 노출이 3회(상한 도달)이므로 새 요청 시 DAILY_LIMIT_REACHED 반환
        val limitReachedResponse = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = fourthTime.plusMinutes(5)
        )
        assertFalse(limitReachedResponse.available)
        assertEquals(AdUnavailableReason.DAILY_LIMIT_REACHED, limitReachedResponse.unavailableReason)

        // 광고 상한 도달 시에도 대상 기록의 벌금 상태(PENDING, 3000원)와 리데이 기한은 그대로 유지되어야 함
        val unchangedRecord = dailyRecordRepository.findById(lateRecord.id).orElseThrow()
        assertEquals(PenaltyStatus.PENDING, unchangedRecord.penaltyStatus)
        assertEquals(3000, unchangedRecord.penaltyAmount)
        assertFalse(unchangedRecord.redayApplied)
    }

    @Test
    fun `운영 중인 활성 캠페인이 없으면 NO_AVAILABLE_AD를 반환하고 벌금 상태나 기한을 변경하지 않는다`() {
        val lateRecord = createEligibleLateRecord()
        val originalDeadline = lateRecord.effectiveRedayDeadline()

        // 기본 캠페인을 PAUSED로 변경
        adService.updateCampaign(
            campaignId = defaultCampaign.id,
            request = UpdateAdCampaignRequest(status = AdCampaignStatus.PAUSED)
        )

        val response = adService.requestAdSession(
            userId = ownerUser.id,
            request = RequestAdSessionRequest(dailyRecordId = lateRecord.id),
            now = validNow
        )

        assertFalse(response.available)
        assertEquals(AdUnavailableReason.NO_AVAILABLE_AD, response.unavailableReason)
        assertNull(response.session)

        val recordAfter = dailyRecordRepository.findById(lateRecord.id).orElseThrow()
        assertEquals(PenaltyStatus.PENDING, recordAfter.penaltyStatus)
        assertEquals(3000, recordAfter.penaltyAmount)
        assertEquals(originalDeadline, recordAfter.effectiveRedayDeadline())
    }

    @Test
    fun `광고 세션 발급 API 엔드포인트가 정상 동작한다`() {
        val nowKst = com.dayuse.global.util.DateTimeUtils.nowKst()
        val targetDate = nowKst.toLocalDate().minusDays(1)

        adService.updateCampaign(
            campaignId = defaultCampaign.id,
            request = UpdateAdCampaignRequest(
                startAt = nowKst.minusDays(2),
                endAt = nowKst.plusDays(2)
            )
        )

        val challengeNow = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = ownerUser.id,
                title = "실시간 테스트 챌린지",
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
                imageUrl = "https://example.com/now.jpg",
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

        mockMvc.post("/api/v1/ads/sessions") {
            header("Authorization", "Bearer $ownerToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(RequestAdSessionRequest(dailyRecordId = recordNow.id))
        }.andExpect {
            status { isOk() }
            jsonPath("$.available") { value(true) }
            jsonPath("$.session.requiredWatchSeconds") { value(10) }
            jsonPath("$.session.creative.badgeText") { value(AdCreative.REQUIRED_BADGE_TEXT) }
        }
    }
}
