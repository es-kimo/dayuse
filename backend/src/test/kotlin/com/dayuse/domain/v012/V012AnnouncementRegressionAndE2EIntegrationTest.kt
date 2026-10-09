@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v012

import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.domain.analytics.ProductEventRepository
import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.service.AnalyticsAccessGuard
import com.dayuse.domain.analytics.service.ProductEventService
import com.dayuse.domain.announcement.Announcement
import com.dayuse.domain.announcement.AnnouncementActionTarget
import com.dayuse.domain.announcement.AnnouncementDisplayPhase
import com.dayuse.domain.announcement.AnnouncementFeatureConditionType
import com.dayuse.domain.announcement.AnnouncementPlacement
import com.dayuse.domain.announcement.AnnouncementRepository
import com.dayuse.domain.announcement.AnnouncementUserStateRepository
import com.dayuse.domain.announcement.dto.AnnouncementPublishRequest
import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.service.AnnouncementFeatureEligibilityEvaluator
import com.dayuse.domain.announcement.service.AnnouncementService
import com.dayuse.domain.experiment.ExperimentRepository
import com.dayuse.domain.experiment.ExperimentVariant
import com.dayuse.domain.experiment.dto.ExperimentCreateRequest
import com.dayuse.domain.experiment.service.ExperimentService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class V012AnnouncementRegressionAndE2EIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var announcementService: AnnouncementService

    @Autowired
    private lateinit var announcementRepository: AnnouncementRepository

    @Autowired
    private lateinit var announcementUserStateRepository: AnnouncementUserStateRepository

    @Autowired
    private lateinit var experimentService: ExperimentService

    @Autowired
    private lateinit var experimentRepository: ExperimentRepository

    @Autowired
    private lateinit var productEventService: ProductEventService

    @Autowired
    private lateinit var productEventRepository: ProductEventRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    private lateinit var adminUser: User
    private lateinit var normalUserA: User
    private lateinit var normalUserB: User
    private lateinit var userAToken: String
    private lateinit var userBToken: String

    private val baseNow = LocalDateTime.of(2026, 10, 6, 14, 0, 0)

    @BeforeEach
    fun setUp() {
        productEventRepository.deleteAll()
        announcementUserStateRepository.deleteAll()
        announcementRepository.deleteAll()
        experimentRepository.deleteAll()
        userRepository.deleteAll()

        adminUser = userRepository.save(
            User(kakaoId = "kakao-v012-admin", nickname = "소식총괄관리자")
        )
        normalUserA = userRepository.save(
            User(kakaoId = "kakao-v012-usera", nickname = "사용자A")
        )
        normalUserB = userRepository.save(
            User(kakaoId = "kakao-v012-userb", nickname = "사용자B")
        )
        userAToken = jwtTokenProvider.generateAccessToken(normalUserA.id)
        userBToken = jwtTokenProvider.generateAccessToken(normalUserB.id)
    }

    @Test
    @DisplayName("시나리오 1: 5단계 생명주기 및 시간 경계에 따른 진입점(점·카드·인라인·목록·상세) 노출 정합성 검증")
    fun scenario1_lifecycleAndNoticeTimeBoundaries() {
        // 1. DRAFT 상태
        val draft = announcementService.createDraft(
            actorId = adminUser.id,
            request = AnnouncementUpsertRequest(
                title = "새로운 모임 만들기 오픈",
                summary = "이제 다양한 모임을 한눈에 보고 참여해 보세요.",
                body = "모임 생성 페이지에서 내 관심사에 맞는 모임을 쉽게 만들어보세요.",
                ctaLabel = "모임 만들기",
                ctaTarget = AnnouncementActionTarget.GROUP_CREATE,
                placement = AnnouncementPlacement.CERT_CREATE,
                homeVisible = true
            ),
            now = baseNow
        )

        // 초안 상태: 목록/상세/미확인 점/홈/인라인 모두 비노출
        assertTrue(announcementService.listVisibleAnnouncementsForUser(normalUserA.id, baseNow).isEmpty())
        assertFalse(announcementService.getUnreadDotStatus(normalUserA.id, baseNow).hasUnread)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.HOME, baseNow).announcement)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.CERT_CREATE, baseNow).announcement)
        assertThrows(ResourceNotFoundException::class.java) {
            announcementService.getAnnouncementDetailForUser(normalUserA.id, draft.id, markAsReadOnOpen = false, now = baseNow)
        }

        // 2. SCHEDULED (예약 대기: baseNow + 2시간 후 게시)
        val publishAt = baseNow.plusHours(2)
        val noticeEndsAt = publishAt.plusDays(7)
        announcementService.publishAnnouncement(
            actorId = adminUser.id,
            announcementId = draft.id,
            request = AnnouncementPublishRequest(publishAt = publishAt, noticeEndsAt = noticeEndsAt),
            now = baseNow
        )

        val beforePublishTime = publishAt.minusMinutes(1)
        assertTrue(announcementService.listVisibleAnnouncementsForUser(normalUserA.id, beforePublishTime).isEmpty())
        assertFalse(announcementService.getUnreadDotStatus(normalUserA.id, beforePublishTime).hasUnread)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.HOME, beforePublishTime).announcement)

        // 3. ACTIVE_NOTICE (게시 시각 도달 및 안내 기간 중)
        val activeTime = publishAt.plusHours(1)
        val visibleList = announcementService.listVisibleAnnouncementsForUser(normalUserA.id, activeTime)
        assertEquals(1, visibleList.size)
        assertEquals(AnnouncementDisplayPhase.ACTIVE_NOTICE, visibleList.first().displayPhase)
        assertTrue(announcementService.getUnreadDotStatus(normalUserA.id, activeTime).hasUnread)
        assertNotNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.HOME, activeTime).announcement)
        assertNotNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.CERT_CREATE, activeTime).announcement)

        val detailActive = announcementService.getAnnouncementDetailForUser(
            normalUserA.id, draft.id, markAsReadOnOpen = false, now = activeTime
        )
        assertEquals(draft.id, detailActive.id)

        // 4. NOTICE_EXPIRED (안내 기간 종료: now >= noticeEndsAt)
        val expiredTime = noticeEndsAt
        assertFalse(announcementService.getUnreadDotStatus(normalUserA.id, expiredTime).hasUnread)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.HOME, expiredTime).announcement)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.CERT_CREATE, expiredTime).announcement)

        val listExpired = announcementService.listVisibleAnnouncementsForUser(normalUserA.id, expiredTime)
        assertEquals(1, listExpired.size)
        assertEquals(AnnouncementDisplayPhase.NOTICE_EXPIRED, listExpired.first().displayPhase)

        val detailExpired = announcementService.getAnnouncementDetailForUser(
            normalUserA.id, draft.id, markAsReadOnOpen = false, now = expiredTime
        )
        assertEquals(draft.id, detailExpired.id)

        // 5. ENDED (게시 강제 종료)
        val endedTime = expiredTime.plusHours(1)
        announcementService.endAnnouncement(actorId = adminUser.id, announcementId = draft.id, now = endedTime)

        assertTrue(announcementService.listVisibleAnnouncementsForUser(normalUserA.id, endedTime).isEmpty())
        assertFalse(announcementService.getUnreadDotStatus(normalUserA.id, endedTime).hasUnread)
        assertThrows(ResourceNotFoundException::class.java) {
            announcementService.getAnnouncementDetailForUser(normalUserA.id, draft.id, markAsReadOnOpen = false, now = endedTime)
        }
    }

    @Test
    @DisplayName("시나리오 2: 다기기·새 세션 동기화 및 닫기 vs 읽음 분리, 게시 중 수정 시 상태 보존 검증")
    fun scenario2_multiDeviceDismissVsReadAndContentUpdatePreservation() {
        val notice = announcementService.createDraft(
            actorId = adminUser.id,
            request = AnnouncementUpsertRequest(
                title = "다기기 동기화 테스트 소식",
                summary = "닫기와 읽음 분리 검증",
                body = "본문 내용",
                homeVisible = true,
                placement = AnnouncementPlacement.CERT_CREATE
            ),
            now = baseNow
        )
        announcementService.publishAnnouncement(
            actorId = adminUser.id,
            announcementId = notice.id,
            request = AnnouncementPublishRequest(publishAt = baseNow),
            now = baseNow
        )

        // 기기 1에서 사용자A가 홈 카드 닫기(Dismiss)
        val dismissTime = baseNow.plusMinutes(5)
        announcementService.markAsDismissed(normalUserA.id, notice.id, dismissTime)

        // 기기 2(동일 사용자A의 다른 세션)에서 확인:
        // - 미확인 점: 꺼짐
        // - 홈/인라인: 노출 안 됨
        // - 목록: 여전히 읽지 않은 소식(isRead=false, isDismissed=true)으로 노출
        assertFalse(announcementService.getUnreadDotStatus(normalUserA.id, dismissTime).hasUnread)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.HOME, dismissTime).announcement)
        assertNull(announcementService.getActiveNoticeForPlacement(normalUserA.id, AnnouncementPlacement.CERT_CREATE, dismissTime).announcement)

        val listUserA = announcementService.listVisibleAnnouncementsForUser(normalUserA.id, dismissTime)
        assertEquals(1, listUserA.size)
        assertFalse(listUserA.first().isRead)
        assertTrue(listUserA.first().isDismissed)

        // 다른 사용자(사용자B)에게는 전혀 영향 없음 (여전히 미확인 점 켜짐, 홈 카드 노출)
        assertTrue(announcementService.getUnreadDotStatus(normalUserB.id, dismissTime).hasUnread)
        assertNotNull(announcementService.getActiveNoticeForPlacement(normalUserB.id, AnnouncementPlacement.HOME, dismissTime).announcement)

        // 기기 2에서 목록을 통해 상세 열람(markAsReadOnOpen = true)
        val readTime = dismissTime.plusMinutes(10)
        val detailUserA = announcementService.getAnnouncementDetailForUser(
            normalUserA.id, notice.id, markAsReadOnOpen = true, now = readTime
        )
        assertTrue(detailUserA.isRead)
        assertTrue(detailUserA.isDismissed)
        assertEquals(readTime, detailUserA.readAt)
        assertEquals(dismissTime, detailUserA.dismissedAt)

        // 운영자가 게시 중 내용(제목·이미지 등)을 수정
        val updateTime = readTime.plusHours(2)
        announcementService.updateAnnouncement(
            actorId = adminUser.id,
            announcementId = notice.id,
            request = AnnouncementUpsertRequest(
                title = "내용이 수정된 소식",
                summary = "수정된 요약",
                body = "수정된 본문",
                imageUrl = "/assets/announcements/updated.png",
                imageAlt = "수정 이미지 대체텍스트",
                homeVisible = true,
                placement = AnnouncementPlacement.CERT_CREATE
            ),
            now = updateTime
        )

        // 수정 후 사용자A의 상태는 초기화되지 않고 유지되어야 함
        val listAfterUpdate = announcementService.listVisibleAnnouncementsForUser(normalUserA.id, updateTime)
        assertEquals("내용이 수정된 소식", listAfterUpdate.first().title)
        assertTrue(listAfterUpdate.first().isRead)
        assertTrue(listAfterUpdate.first().isDismissed)
        assertEquals(readTime, listAfterUpdate.first().readAt)
        assertEquals(dismissTime, listAfterUpdate.first().dismissedAt)
    }

    @Test
    @DisplayName("시나리오 3: 비관리자 운영 요청 차단(403) 및 조건부 소식(실험 연동)과 Fail-Safe 안전 격리 검증")
    fun scenario3_adminSecurityAndConditionalFeatureFailSafe() {
        // 1. 비관리자 권한 차단 검증
        val guard = AnalyticsAccessGuard(adminUserIdsProperty = "${adminUser.id}", allowAllWhenEmpty = false)
        assertThrows(ForbiddenException::class.java) {
            guard.verifyCanReadAnalytics(normalUserA.id)
        }

        // 2. 실험 연동 조건부 소식
        val expKey = "v012-experiment-conditional"
        experimentService.createExperiment(
            ExperimentCreateRequest(
                experimentKey = expKey,
                name = "v012 실험",
                rolloutPercentage = 100,
                variantARatio = 50,
                variantBRatio = 50
            ),
            now = baseNow
        )

        val conditionalNotice = announcementService.createDraft(
            actorId = adminUser.id,
            request = AnnouncementUpsertRequest(
                title = "실험군 B 전용 기능 안내",
                summary = "실험군 B에게만 보이는 기능 안내",
                body = "본문",
                featureConditionType = AnnouncementFeatureConditionType.EXPERIMENT_VARIANT_B,
                featureKey = expKey,
                homeVisible = true
            ),
            now = baseNow
        )
        announcementService.publishAnnouncement(
            actorId = adminUser.id,
            announcementId = conditionalNotice.id,
            request = AnnouncementPublishRequest(publishAt = baseNow),
            now = baseNow
        )

        // 실험이 아직 DRAFT일 때는 누구에게도 노출되지 않음
        assertTrue(announcementService.listVisibleAnnouncementsForUser(normalUserA.id, baseNow).isEmpty())

        // 실험 활성화
        experimentService.activateExperiment(expKey, baseNow)

        // 사용자별 variant 배정 후 확인
        val assignmentA = experimentService.assignVariant(expKey, normalUserA.id)
        val isAInVariantB = assignmentA.variant == ExperimentVariant.B

        val visibleForA = announcementService.listVisibleAnnouncementsForUser(normalUserA.id, baseNow)
        if (isAInVariantB) {
            assertEquals(1, visibleForA.size)
        } else {
            assertEquals(0, visibleForA.size)
        }

        // 3. 판정 컴포넌트 장애 시 Fail-Safe 격리 (예외 발생 시 소식만 숨김)
        val failSafeEvaluator = AnnouncementFeatureEligibilityEvaluator(experimentService = null)
        assertFalse(
            failSafeEvaluator.isEligible(
                userId = normalUserA.id,
                conditionType = AnnouncementFeatureConditionType.EXPERIMENT_VARIANT_B,
                featureKey = expKey
            )
        )
    }

    @Test
    @DisplayName("시나리오 4: 공지 분석 이벤트 4종(노출·열람·클릭·닫기) 및 출처 귀속 적재 검증")
    fun scenario4_announcementAnalyticsAndAttributionEvents() {
        val notice = announcementService.createDraft(
            actorId = adminUser.id,
            request = AnnouncementUpsertRequest(
                title = "분석 이벤트 테스트 소식",
                summary = "요약",
                body = "본문",
                homeVisible = true,
                placement = AnnouncementPlacement.CERT_CREATE,
                featureKey = "sample_feature"
            ),
            now = baseNow
        )
        announcementService.publishAnnouncement(
            actorId = adminUser.id,
            announcementId = notice.id,
            request = AnnouncementPublishRequest(publishAt = baseNow),
            now = baseNow
        )

        // 1. 노출 (announcement_impression)
        productEventService.recordEvent(
            authenticatedUserId = normalUserA.id,
            request = ProductEventCreateRequest(
                eventId = "evt-announcement-imp-1",
                eventName = ProductEventName.ANNOUNCEMENT_IMPRESSION.value,
                occurredAt = baseNow.toString(),
                sessionId = "session-1",
                appVersion = "0.12.0",
                properties = mapOf(
                    "announcement_id" to notice.id,
                    "placement" to "HOME",
                    "feature_key" to "sample_feature"
                )
            )
        )

        // 2. 열람 (announcement_opened)
        productEventService.recordEvent(
            authenticatedUserId = normalUserA.id,
            request = ProductEventCreateRequest(
                eventId = "evt-announcement-open-1",
                eventName = ProductEventName.ANNOUNCEMENT_OPENED.value,
                occurredAt = baseNow.plusSeconds(10).toString(),
                sessionId = "session-1",
                appVersion = "0.12.0",
                properties = mapOf(
                    "announcement_id" to notice.id,
                    "placement" to "HOME",
                    "feature_key" to "sample_feature"
                )
            )
        )

        // 3. 실행 클릭 (announcement_cta_clicked)
        productEventService.recordEvent(
            authenticatedUserId = normalUserA.id,
            request = ProductEventCreateRequest(
                eventId = "evt-announcement-cta-1",
                eventName = ProductEventName.ANNOUNCEMENT_CTA_CLICKED.value,
                occurredAt = baseNow.plusSeconds(20).toString(),
                sessionId = "session-1",
                appVersion = "0.12.0",
                properties = mapOf(
                    "announcement_id" to notice.id,
                    "placement" to "HOME",
                    "feature_key" to "sample_feature",
                    "target" to "CERT_CREATE"
                )
            )
        )

        // 4. 닫기 (announcement_dismissed)
        productEventService.recordEvent(
            authenticatedUserId = normalUserA.id,
            request = ProductEventCreateRequest(
                eventId = "evt-announcement-dismiss-1",
                eventName = ProductEventName.ANNOUNCEMENT_DISMISSED.value,
                occurredAt = baseNow.plusSeconds(30).toString(),
                sessionId = "session-1",
                appVersion = "0.12.0",
                properties = mapOf(
                    "announcement_id" to notice.id,
                    "placement" to "HOME",
                    "feature_key" to "sample_feature"
                )
            )
        )

        // 5. 소식 출처를 통한 기능 실행 이벤트 귀속 (source=announcement)
        productEventService.recordEvent(
            authenticatedUserId = normalUserA.id,
            request = ProductEventCreateRequest(
                eventId = "evt-cert-submit-1",
                eventName = ProductEventName.CERTIFICATION_COMPLETED.value,
                occurredAt = baseNow.plusSeconds(40).toString(),
                sessionId = "session-1",
                appVersion = "0.12.0",
                properties = mapOf(
                    "challengeId" to 100L,
                    "source" to "announcement",
                    "announcement_id" to notice.id
                )
            )
        )

        val recordedEvents = productEventRepository.findAll()
        assertEquals(5, recordedEvents.size)
        assertTrue(recordedEvents.any { it.eventName == ProductEventName.ANNOUNCEMENT_IMPRESSION.value })
        assertTrue(recordedEvents.any { it.eventName == ProductEventName.ANNOUNCEMENT_OPENED.value })
        assertTrue(recordedEvents.any { it.eventName == ProductEventName.ANNOUNCEMENT_CTA_CLICKED.value })
        assertTrue(recordedEvents.any { it.eventName == ProductEventName.ANNOUNCEMENT_DISMISSED.value })
        assertTrue(recordedEvents.any { it.eventName == ProductEventName.CERTIFICATION_COMPLETED.value && it.properties["source"] == "announcement" })
    }
}
