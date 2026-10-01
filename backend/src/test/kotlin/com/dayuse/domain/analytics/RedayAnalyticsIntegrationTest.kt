@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.domain.ad.AdCampaignRepository
import com.dayuse.domain.ad.AdCampaignStatus
import com.dayuse.domain.ad.AdCreativeRepository
import com.dayuse.domain.ad.AdRewardHistoryRepository
import com.dayuse.domain.ad.AdSessionRepository
import com.dayuse.domain.ad.AdSlotType
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
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.dto.ApplyRedayRequest
import com.dayuse.domain.redayticket.service.RedayTicketService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
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
 * 리데이·광고·티켓 분석 이벤트 적재 및 재시도 중복 집계 방지 검증 (v0.11 F13)
 *
 * 핵심 검증 지점:
 * 1. 광고 완료 재시도(멱등 응답)로 `reward_granted` / `recovery_ticket_granted`가 2건이 되지 않는다.
 * 2. 리데이 적용 재시도(멱등 응답)로 `recovery_ticket_used` / `recovery_completed`가 2건이 되지 않는다.
 * 3. `reward_granted`와 `recovery_ticket_granted`는 같은 지급 건을 `rewardHistoryId`/`ticketId`로 참조한다.
 * 4. 이벤트 properties에 인증 이미지·인증 문구·닉네임·세션 토큰 등 개인정보가 실리지 않는다.
 *
 * 이 테스트는 `@Transactional`이지만 ProductEvent는 `REQUIRES_NEW`로 독립 커밋되므로
 * 각 테스트 시작 시 `deleteAll()`로 직접 초기화한다.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class RedayAnalyticsIntegrationTest {

    @Autowired private lateinit var productEventRepository: ProductEventRepository
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

    private lateinit var user: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var participant: ChallengeParticipant

    private val baseDate = LocalDate.of(2026, 10, 1)
    private val now = LocalDateTime.of(2026, 10, 2, 14, 0)

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        adRewardHistoryRepository.deleteAll()
        adSessionRepository.deleteAll()
        adCreativeRepository.deleteAll()
        adCampaignRepository.deleteAll()

        user = userRepository.save(
            User(
                kakaoId = "kakao-f13-${System.nanoTime()}",
                nickname = "리데이분석유저"
            )
        )
        group = groupRepository.save(
            Group(
                name = "리데이 분석 모임",
                hostUserId = user.id,
                inviteCode = "F13${System.nanoTime().toString().takeLast(5)}"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user.id, role = GroupRole.HOST))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user.id,
                title = "매일 미라클 모닝",
                verificationCriteria = "기상 인증",
                startDate = baseDate.minusDays(5),
                endDate = baseDate.plusDays(10),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL,
                redayAllowed = true
            )
        )
        participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user.id,
                startDate = challenge.startDate,
                penaltyAmount = 3000
            )
        )

        adService.createCampaign(
            CreateAdCampaignRequest(
                campaignKey = "f13-analytics-campaign",
                title = "분석 검증 캠페인",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 10,
                dailyImpressionLimit = 5,
                startAt = now.minusDays(10),
                endAt = now.plusDays(10),
                creatives = listOf(
                    CreateAdCreativeInput(
                        title = "리데이 안내 소재",
                        description = "10초 시청 시 리데이 티켓 1장",
                        minWatchSeconds = 10,
                        active = true
                    )
                )
            )
        )
    }

    private fun createLateRecord(targetDate: LocalDate = baseDate): DailyRecord {
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = user.id,
                targetDate = targetDate,
                imageUrl = "https://example.com/late-$targetDate.jpg",
                isLate = true
            )
        )
        val record = DailyRecord(
            groupId = group.id,
            challengeId = challenge.id,
            challengeParticipantId = participant.id,
            userId = user.id,
            date = targetDate,
            status = DailyRecordStatus.UNCHECKED
        )
        record.verifyLate(
            verificationId = verification.id,
            isLate = true,
            today = targetDate.plusDays(1),
            redayAllowed = true,
            penaltyAmountForOverdue = 3000,
            submittedAt = now
        )
        return dailyRecordRepository.save(record)
    }

    private fun eventsOf(eventName: ProductEventName): List<ProductEvent> =
        productEventRepository.findAll().filter { it.eventName == eventName.value && it.userId == user.id }

    private fun watchAdToCompletion(recordId: Long): String {
        val issued = adService.requestAdSession(
            userId = user.id,
            request = RequestAdSessionRequest(dailyRecordId = recordId),
            now = now
        )
        val token = issued.session!!.sessionToken
        adService.recordImpression(user.id, token, now.plusSeconds(1))
        return token
    }

    // ── 1. 광고 완료·보상 지급 재시도 중복 집계 방지 ──────────────────

    @Test
    fun `광고 완료를 재시도해도 reward_granted와 recovery_ticket_granted는 각각 1건만 적재된다`() {
        val record = createLateRecord()
        val token = watchAdToCompletion(record.id)

        val first = adService.completeSessionAndGrantReward(
            userId = user.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = now.plusSeconds(12)
        )
        assertTrue(first.newlyGranted)

        // 같은 세션에 대한 재시도 2회: 서버는 멱등 응답만 돌려주고 이벤트는 더 쌓이지 않아야 한다.
        repeat(2) {
            val retry = adService.completeSessionAndGrantReward(
                userId = user.id,
                sessionToken = token,
                request = CompleteAdSessionRequest(watchedSeconds = 10),
                now = now.plusSeconds(20)
            )
            assertFalse(retry.newlyGranted)
            assertEquals(first.grantedTicketId, retry.grantedTicketId)
        }

        assertEquals(1, eventsOf(ProductEventName.AD_COMPLETED).size)
        assertEquals(1, eventsOf(ProductEventName.REWARD_GRANTED).size)
        assertEquals(1, eventsOf(ProductEventName.RECOVERY_TICKET_GRANTED).size)
        assertEquals(1L, redayTicketRepository.findAllByUserId(user.id).size.toLong())
    }

    @Test
    fun `reward_granted와 recovery_ticket_granted는 rewardHistoryId와 ticketId로 같은 지급 건을 참조한다`() {
        val record = createLateRecord()
        val token = watchAdToCompletion(record.id)
        val completed = adService.completeSessionAndGrantReward(
            userId = user.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = now.plusSeconds(12)
        )

        val reward = eventsOf(ProductEventName.REWARD_GRANTED).single()
        val granted = eventsOf(ProductEventName.RECOVERY_TICKET_GRANTED).single()

        assertEquals(completed.rewardHistoryId, (reward.properties["rewardHistoryId"] as Number).toLong())
        assertEquals(completed.grantedTicketId, (reward.properties["ticketId"] as Number).toLong())
        assertEquals(completed.rewardHistoryId, (granted.properties["rewardHistoryId"] as Number).toLong())
        assertEquals(completed.grantedTicketId, (granted.properties["ticketId"] as Number).toLong())

        // 두 이벤트는 같은 지급 1건의 단면이므로, 단순 합산(2)은 보상 수량이 아니다.
        assertEquals(1, (reward.properties["rewardTicketCount"] as Number).toInt())
    }

    // ── 2. 리데이 적용 재시도 중복 집계 방지 ──────────────────────────

    @Test
    fun `리데이 적용을 재시도해도 recovery_ticket_used와 recovery_completed는 각각 1건만 적재된다`() {
        val record = createLateRecord()
        val token = watchAdToCompletion(record.id)
        val completed = adService.completeSessionAndGrantReward(
            userId = user.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = now.plusSeconds(12)
        )

        val applyRequest = ApplyRedayRequest(ticketId = completed.grantedTicketId, dailyRecordId = record.id)
        val firstApply = redayTicketService.applyReday(user.id, applyRequest, now.plusSeconds(30))
        assertTrue(firstApply.penaltyExempted)

        repeat(2) {
            redayTicketService.applyReday(user.id, applyRequest, now.plusSeconds(40))
        }

        assertEquals(1, eventsOf(ProductEventName.RECOVERY_TICKET_USED).size)
        assertEquals(1, eventsOf(ProductEventName.RECOVERY_COMPLETED).size)

        val used = eventsOf(ProductEventName.RECOVERY_TICKET_USED).single()
        val recovered = eventsOf(ProductEventName.RECOVERY_COMPLETED).single()
        assertEquals(completed.grantedTicketId, (used.properties["ticketId"] as Number).toLong())
        assertEquals(record.id, (recovered.properties["dailyRecordId"] as Number).toLong())
        assertEquals(3000, (recovered.properties["exemptedPenaltyAmount"] as Number).toInt())
    }

    // ── 3. 광고 진입·중단·실패 사유 기록 ─────────────────────────────

    @Test
    fun `광고 세션 발급과 중단은 ad_requested와 ad_served 그리고 중단 1회만 기록한다`() {
        val record = createLateRecord()
        val issued = adService.requestAdSession(
            userId = user.id,
            request = RequestAdSessionRequest(dailyRecordId = record.id),
            now = now
        )
        val token = issued.session!!.sessionToken
        adService.recordImpression(user.id, token, now.plusSeconds(1))

        val firstAbandon = adService.abandonSession(user.id, token, now.plusSeconds(3))
        assertTrue(firstAbandon.firstAbandon)
        val secondAbandon = adService.abandonSession(user.id, token, now.plusSeconds(5))
        assertFalse(secondAbandon.firstAbandon)

        assertEquals(1, eventsOf(ProductEventName.AD_REQUESTED).size)
        assertEquals(1, eventsOf(ProductEventName.AD_SERVED).size)
        assertEquals(1, eventsOf(ProductEventName.AD_IMPRESSION).size)
        assertEquals(1, eventsOf(ProductEventName.AD_ABANDONED).size)
        assertEquals(0, eventsOf(ProductEventName.AD_COMPLETED).size)
        assertEquals(0, eventsOf(ProductEventName.REWARD_GRANTED).size)
    }

    @Test
    fun `리데이 기한이 지난 기록에 리데이를 적용하면 recovery_failed가 사유와 함께 기록된다`() {
        val record = createLateRecord()
        redayTicketService.grantTicket(user.id)

        // 대상일 이틀 뒤 09시 이후 = 리데이 기한 만료
        val expiredNow = baseDate.plusDays(2).atTime(9, 1)
        assertThrows(BadRequestException::class.java) {
            redayTicketService.applyReday(
                user.id,
                ApplyRedayRequest(dailyRecordId = record.id),
                expiredNow
            )
        }

        val failed = eventsOf(ProductEventName.RECOVERY_FAILED).single()
        assertEquals("apply_reday", failed.properties["step"])
        assertEquals("BadRequestException", failed.properties["reason"])
        assertEquals(0, eventsOf(ProductEventName.RECOVERY_COMPLETED).size)
    }

    // ── 4. 개인정보 배제 검증 ────────────────────────────────────────

    @Test
    fun `리데이 광고 이벤트 properties에는 이미지와 인증 문구와 닉네임과 세션 토큰이 실리지 않는다`() {
        val record = createLateRecord()
        val token = watchAdToCompletion(record.id)
        val completed = adService.completeSessionAndGrantReward(
            userId = user.id,
            sessionToken = token,
            request = CompleteAdSessionRequest(watchedSeconds = 10),
            now = now.plusSeconds(12)
        )
        redayTicketService.applyReday(
            user.id,
            ApplyRedayRequest(ticketId = completed.grantedTicketId, dailyRecordId = record.id),
            now.plusSeconds(30)
        )

        val recorded = productEventRepository.findAll().filter { it.userId == user.id }
        assertTrue(recorded.isNotEmpty())
        for (event in recorded) {
            for ((key, value) in event.properties) {
                val normalizedKey = key.lowercase()
                assertFalse(
                    normalizedKey.contains("image") ||
                        normalizedKey.contains("comment") ||
                        normalizedKey.contains("nickname") ||
                        normalizedKey.contains("token"),
                    "민감 키가 포함되었습니다: $key"
                )
                val text = value?.toString() ?: continue
                assertFalse(text.startsWith("http"), "이벤트 값에 외부 URL이 포함되었습니다: $key")
                assertFalse(text == token, "이벤트 값에 세션 토큰이 포함되었습니다: $key")
                assertFalse(text == user.nickname, "이벤트 값에 닉네임이 포함되었습니다: $key")
            }
        }

        // 서버 적재 이벤트는 고정 세션 식별자로 구분된다.
        assertNotNull(recorded.firstOrNull { it.sessionId == "server-reday" })
    }
}
