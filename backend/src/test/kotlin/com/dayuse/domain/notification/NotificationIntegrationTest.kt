@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.notification

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.dto.RegisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.UnregisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.UpdateNotificationSettingRequest
import com.dayuse.domain.notification.service.NotificationPushService
import com.dayuse.domain.notification.service.NotificationSchedulerService
import com.dayuse.domain.notification.service.PushSendResult
import com.dayuse.domain.notification.service.WebPushClient
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.ConcurrentHashMap

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationIntegrationTest {

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
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var userNotificationSettingRepository: UserNotificationSettingRepository

    @Autowired
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @Autowired
    private lateinit var pushSendLogRepository: PushSendLogRepository

    @Autowired
    private lateinit var notificationPushService: NotificationPushService

    @Autowired
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    @Autowired
    private lateinit var fakeWebPushClient: FakeWebPushClient

    private lateinit var user: User
    private lateinit var userToken: String

    @TestConfiguration
    class TestConfig {
        @Bean
        @Primary
        fun fakeWebPushClient(): FakeWebPushClient = FakeWebPushClient()
    }

    class FakeWebPushClient : WebPushClient {
        val sentEndpoints = mutableListOf<String>()
        val endpointResponses = ConcurrentHashMap<String, PushSendResult>()

        fun reset() {
            sentEndpoints.clear()
            endpointResponses.clear()
        }

        override fun send(
            endpoint: String,
            p256dh: String,
            auth: String,
            payloadJson: String
        ): PushSendResult {
            sentEndpoints.add(endpoint)
            return endpointResponses[endpoint] ?: PushSendResult(
                statusCode = 201,
                isSuccess = true,
                isExpired = false
            )
        }
    }

    @BeforeEach
    fun setUp() {
        fakeWebPushClient.reset()
        user = userRepository.save(User(kakaoId = "noti_user_1", nickname = "알림테스터"))
        userToken = jwtTokenProvider.generateAccessToken(user.id)
    }

    @Test
    fun `내 알림 설정 조회 시 기본값은 꺼짐(OFF) 및 21시이며 VAPID 공개키를 포함한다`() {
        mockMvc.get("/api/v1/notifications/settings") {
            header("Authorization", "Bearer $userToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.enabled") { value(false) }
            jsonPath("$.reminderTime") { value("21:00") }
            jsonPath("$.hasActiveSubscription") { value(false) }
            jsonPath("$.vapidPublicKey") { isNotEmpty() }
        }
    }

    @Test
    fun `알림 설정을 켜고 희망 시간을 22시 30분으로 수정할 수 있다`() {
        val request = UpdateNotificationSettingRequest(enabled = true, reminderTime = "22:30")

        mockMvc.put("/api/v1/notifications/settings") {
            header("Authorization", "Bearer $userToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
            jsonPath("$.enabled") { value(true) }
            jsonPath("$.reminderTime") { value("22:30") }
        }

        val saved = userNotificationSettingRepository.findByUserId(user.id)
        assertNotNull(saved)
        assertTrue(saved!!.enabled)
        assertEquals(LocalTime.of(22, 30), saved.reminderTime)
    }

    @Test
    fun `브라우저 웹 푸시 구독 정보를 등록하고 다시 등록하면 기존 구독이 갱신된다`() {
        val request1 = RegisterPushSubscriptionRequest(
            endpoint = "https://fcm.googleapis.com/fcm/send/device-token-1",
            p256dh = "key1",
            auth = "auth1"
        )

        mockMvc.post("/api/v1/notifications/subscriptions") {
            header("Authorization", "Bearer $userToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request1)
        }.andExpect {
            status { isOk() }
        }

        val subscriptions = pushSubscriptionRepository.findAllByUserIdAndIsActiveTrue(user.id)
        assertEquals(1, subscriptions.size)
        assertEquals("https://fcm.googleapis.com/fcm/send/device-token-1", subscriptions[0].endpoint)

        // 동일 엔드포인트로 키 갱신
        val request2 = RegisterPushSubscriptionRequest(
            endpoint = "https://fcm.googleapis.com/fcm/send/device-token-1",
            p256dh = "key2-updated",
            auth = "auth2-updated"
        )

        mockMvc.post("/api/v1/notifications/subscriptions") {
            header("Authorization", "Bearer $userToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request2)
        }.andExpect {
            status { isOk() }
        }

        val updated = pushSubscriptionRepository.findByEndpoint("https://fcm.googleapis.com/fcm/send/device-token-1")
        assertNotNull(updated)
        assertEquals("key2-updated", updated!!.p256dh)
        assertEquals("auth2-updated", updated.auth)
        assertTrue(updated.isActive)
    }

    @Test
    fun `현재 기기의 푸시 구독을 해제하면 isActive가 false가 된다`() {
        val subscription = pushSubscriptionRepository.save(
            PushSubscription(
                userId = user.id,
                endpoint = "https://fcm.googleapis.com/fcm/send/device-token-to-delete",
                p256dh = "key",
                auth = "auth",
                isActive = true
            )
        )

        val request = UnregisterPushSubscriptionRequest(endpoint = subscription.endpoint)

        mockMvc.delete("/api/v1/notifications/subscriptions") {
            header("Authorization", "Bearer $userToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isOk() }
        }

        val updated = pushSubscriptionRepository.findById(subscription.id).orElseThrow()
        assertFalse(updated.isActive)
    }

    @Test
    fun `만료된 엔드포인트(410 Gone) 응답 수신 시 구독 엔티티가 즉시 비활성화된다`() {
        val expiredEndpoint = "https://fcm.googleapis.com/fcm/send/expired-device"
        val subscription = pushSubscriptionRepository.save(
            PushSubscription(
                userId = user.id,
                endpoint = expiredEndpoint,
                p256dh = "key",
                auth = "auth",
                isActive = true
            )
        )

        // Mock WebPushClient가 410 Gone을 반환하도록 설정
        fakeWebPushClient.endpointResponses[expiredEndpoint] = PushSendResult(
            statusCode = 410,
            isSuccess = false,
            isExpired = true
        )

        // 테스트 알림 발송 시도
        val result = notificationPushService.sendTestPush(user.id)
        assertFalse(result.success)

        val reloaded = pushSubscriptionRepository.findById(subscription.id).orElseThrow()
        assertFalse(reloaded.isActive, "410 응답을 받은 구독은 isActive가 false로 변경되어야 합니다.")
    }

    @Test
    fun `스케줄러는 미인증 챌린지가 남아 있는 대상자에게만 단 1회의 알림을 발송하고 PushSendLog를 남긴다`() {
        val today = DateTimeUtils.todayKst()
        val targetTime = LocalTime.of(21, 0)
        val targetDateTime = LocalDateTime.of(today, targetTime)

        // 알림 설정 ON (21:00)
        val setting = UserNotificationSetting(userId = user.id, enabled = true, reminderTime = targetTime)
        userNotificationSettingRepository.save(setting)

        // 기기 구독 등록
        pushSubscriptionRepository.save(
            PushSubscription(
                userId = user.id,
                endpoint = "https://fcm.googleapis.com/fcm/send/active-device-1",
                p256dh = "key",
                auth = "auth",
                isActive = true
            )
        )

        // 모임 및 미인증 챌린지 2개 생성
        val group = groupRepository.save(Group(name = "챌린지 모임", hostUserId = user.id, inviteCode = "NOTI-111"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user.id, role = GroupRole.MEMBER))

        val challenge1 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user.id,
                title = "물 마시기",
                description = "설명",
                verificationCriteria = "인증기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5)
            )
        )
        val challenge2 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user.id,
                title = "운동하기",
                description = "설명",
                verificationCriteria = "인증기준",
                startDate = today.minusDays(2),
                endDate = today.plusDays(3)
            )
        )

        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge1.id, userId = user.id, penaltyAmount = 1000))
        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge2.id, userId = user.id, penaltyAmount = 1000))

        // 스케줄러 실행 (21:00)
        notificationSchedulerService.processScheduledNotifications(targetDateTime)

        // 검증: 1건 발송되었는가?
        assertEquals(1, fakeWebPushClient.sentEndpoints.size)
        assertEquals("https://fcm.googleapis.com/fcm/send/active-device-1", fakeWebPushClient.sentEndpoints[0])

        // 검증: PushSendLog가 2건의 미인증으로 남았는가?
        assertTrue(pushSendLogRepository.existsByUserIdAndSendDate(user.id, today))

        // 동일 날짜에 스케줄러 재실행 시 당일 1회 보장으로 발송되지 않아야 함
        fakeWebPushClient.reset()
        notificationSchedulerService.processScheduledNotifications(targetDateTime)
        assertEquals(0, fakeWebPushClient.sentEndpoints.size, "동일 날짜에는 중복 발송되지 않아야 합니다.")
    }

    @Test
    fun `모든 챌린지 인증을 완료한 사용자는 스케줄러 발송 대상에서 제외된다`() {
        val today = DateTimeUtils.todayKst()
        val targetTime = LocalTime.of(21, 0)
        val targetDateTime = LocalDateTime.of(today, targetTime)

        userNotificationSettingRepository.save(UserNotificationSetting(userId = user.id, enabled = true, reminderTime = targetTime))
        pushSubscriptionRepository.save(
            PushSubscription(userId = user.id, endpoint = "https://fcm.googleapis.com/fcm/send/active-device-2", p256dh = "k", auth = "a", isActive = true)
        )

        val group = groupRepository.save(Group(name = "완료 모임", hostUserId = user.id, inviteCode = "NOTI-222"))
        val challenge = challengeRepository.save(
            Challenge(groupId = group.id, creatorUserId = user.id, title = "독서", description = "설명", verificationCriteria = "기준", startDate = today.minusDays(1), endDate = today.plusDays(1))
        )
        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge.id, userId = user.id, penaltyAmount = 1000))

        // 이미 오늘 인증 완료함
        verificationRepository.save(
            Verification(groupId = group.id, challengeId = challenge.id, userId = user.id, targetDate = today, imageUrl = "url", comment = "완료", isLate = false)
        )

        notificationSchedulerService.processScheduledNotifications(targetDateTime)

        // 발송되지 않아야 함
        assertEquals(0, fakeWebPushClient.sentEndpoints.size)
        assertFalse(pushSendLogRepository.existsByUserIdAndSendDate(user.id, today))
    }

    @Test
    fun `GET api v1 today 엔드포인트로 참여 중인 모든 모임의 오늘 할 일 목록을 통합 조회할 수 있다`() {
        val today = DateTimeUtils.todayKst()
        val group1 = groupRepository.save(Group(name = "1번 모임", hostUserId = user.id, inviteCode = "NOTI-G1"))
        val group2 = groupRepository.save(Group(name = "2번 모임", hostUserId = user.id, inviteCode = "NOTI-G2"))

        val challenge1 = challengeRepository.save(
            Challenge(groupId = group1.id, creatorUserId = user.id, title = "1번 챌린지", description = "설명", verificationCriteria = "기준1", startDate = today.minusDays(1), endDate = today.plusDays(1))
        )
        val challenge2 = challengeRepository.save(
            Challenge(groupId = group2.id, creatorUserId = user.id, title = "2번 챌린지", description = "설명", verificationCriteria = "기준2", startDate = today.minusDays(1), endDate = today.plusDays(1))
        )

        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge1.id, userId = user.id, penaltyAmount = 1000))
        challengeParticipantRepository.save(ChallengeParticipant(challengeId = challenge2.id, userId = user.id, penaltyAmount = 1000))

        mockMvc.get("/api/v1/today") {
            header("Authorization", "Bearer $userToken")
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
            jsonPath("$[0].groupName") { isNotEmpty() }
            jsonPath("$[1].groupName") { isNotEmpty() }
        }
    }
}
