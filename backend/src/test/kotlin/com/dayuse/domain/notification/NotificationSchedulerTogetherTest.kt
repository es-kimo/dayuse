@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.notification

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.service.NotificationSchedulerService
import com.dayuse.domain.notification.service.PushSendResult
import com.dayuse.domain.notification.service.WebPushClient
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import java.time.LocalTime
import java.util.concurrent.ConcurrentHashMap

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class NotificationSchedulerTogetherTest {

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
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @Autowired
    private lateinit var fakeWebPushClient: FakeWebPushClient

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var group: Group

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
        userA = userRepository.save(User(kakaoId = "noti_user_a", nickname = "민수"))
        userB = userRepository.save(User(kakaoId = "noti_user_b", nickname = "영희"))

        group = groupRepository.save(
            Group(
                name = "함께 모임",
                hostUserId = userA.id,
                inviteCode = "TOGETHER-NOTI"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userA.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userB.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `중단된 챌린지는 미인증 카운트에서 즉시 제외되며 리마인더가 발송되지 않는다`() {
        val today = DateTimeUtils.todayKst()
        val targetTime = LocalTime.of(21, 0)
        val targetDateTime = LocalDateTime.of(today, targetTime)

        userNotificationSettingRepository.save(
            UserNotificationSetting(userId = userA.id, enabled = true, reminderTime = targetTime)
        )
        pushSubscriptionRepository.save(
            PushSubscription(userId = userA.id, endpoint = "https://fcm/userA", p256dh = "k", auth = "a", isActive = true)
        )

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "중단될 챌린지",
                description = "설명",
                verificationCriteria = "기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                executionType = ExecutionType.INDIVIDUAL
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 1000)
        )

        // 챌린지 중단 처리
        challenge.abort(userA.id, "개인 사정으로 중단")
        challengeRepository.save(challenge)

        val pending = notificationSchedulerService.countPendingChallenges(userA.id, today)
        assertEquals(0, pending, "중단된 챌린지는 미인증으로 집계되지 않아야 합니다.")

        notificationSchedulerService.processScheduledNotifications(targetDateTime)
        assertEquals(0, fakeWebPushClient.sentEndpoints.size, "중단된 챌린지에 대해서는 푸시가 발송되지 않아야 합니다.")
    }

    @Test
    fun `함께하기 챌린지에서 다른 참가자가 오늘 인증을 완료했으면 모든 참가자의 리마인더 발송이 제외된다`() {
        val today = DateTimeUtils.todayKst()
        val targetTime = LocalTime.of(21, 0)
        val targetDateTime = LocalDateTime.of(today, targetTime)

        // 영희(userB)의 알림 설정 및 구독 등록
        userNotificationSettingRepository.save(
            UserNotificationSetting(userId = userB.id, enabled = true, reminderTime = targetTime)
        )
        pushSubscriptionRepository.save(
            PushSubscription(userId = userB.id, endpoint = "https://fcm/userB", p256dh = "k", auth = "a", isActive = true)
        )

        val togetherChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "매일 아침 달리기",
                description = "함께하는 챌린지",
                verificationCriteria = "러닝 앱 캡처",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = togetherChallenge.id, userId = userA.id, penaltyAmount = 0)
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = togetherChallenge.id, userId = userB.id, penaltyAmount = 0)
        )

        // 민수(userA)가 오늘 인증을 등록함
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = togetherChallenge.id,
                userId = userA.id,
                targetDate = today,
                imageUrl = "running.jpg",
                comment = "오늘 5km 완료!",
                isLate = false
            )
        )

        // 영희(userB) 본인은 인증하지 않았지만 함께하기 공동 달성이므로 pendingCount가 0이어야 함
        val pendingB = notificationSchedulerService.countPendingChallenges(userB.id, today)
        assertEquals(0, pendingB, "함께하기 공동 완료 시 다른 참가자도 미인증 카운트에서 제외되어야 합니다.")

        notificationSchedulerService.processScheduledNotifications(targetDateTime)
        assertEquals(0, fakeWebPushClient.sentEndpoints.size, "공동 달성된 챌린지는 미수행 리마인더가 발송되지 않아야 합니다.")
    }
}
