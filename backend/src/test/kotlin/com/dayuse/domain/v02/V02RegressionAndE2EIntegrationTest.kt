@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v02

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.RestartChallengeRequest
import com.dayuse.domain.challenge.dto.StartDateType
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.PushSendLogRepository
import com.dayuse.domain.notification.PushSubscriptionRepository
import com.dayuse.domain.notification.UserNotificationSettingRepository
import com.dayuse.domain.notification.dto.RegisterPushSubscriptionRequest
import com.dayuse.domain.notification.dto.UpdateNotificationSettingRequest
import com.dayuse.domain.notification.service.NotificationSchedulerService
import com.dayuse.domain.notification.service.WebPushClient
import com.dayuse.domain.settlement.GroupAccount
import com.dayuse.domain.settlement.GroupAccountRepository
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.share.ShareCardRepository
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V02RegressionAndE2EIntegrationTest {

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
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var shareCardRepository: ShareCardRepository

    @Autowired
    private lateinit var pushSubscriptionRepository: PushSubscriptionRepository

    @Autowired
    private lateinit var userNotificationSettingRepository: UserNotificationSettingRepository

    @Autowired
    private lateinit var pushSendLogRepository: PushSendLogRepository

    @Autowired
    private lateinit var groupAccountRepository: GroupAccountRepository

    @Autowired
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @MockBean
    private lateinit var webPushClient: WebPushClient

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var outsiderUser: User
    private lateinit var group: Group

    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var outsiderToken: String

    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        // Mock WebPushClient 항상 성공
        Mockito.`when`(
            webPushClient.send(
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString()
            )
        ).thenReturn(com.dayuse.domain.notification.service.PushSendResult(statusCode = 200, isSuccess = true, isExpired = false))

        hostUser = userRepository.save(User(kakaoId = "v02_host", nickname = "모임장"))
        memberUser = userRepository.save(User(kakaoId = "v02_member", nickname = "도전자"))
        outsiderUser = userRepository.save(User(kakaoId = "v02_outsider", nickname = "외부인"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)
        outsiderToken = "Bearer " + jwtTokenProvider.generateAccessToken(outsiderUser.id)

        group = groupRepository.save(
            Group(
                name = "v0.2 E2E 통합 테스트 모임",
                hostUserId = hostUser.id,
                inviteCode = "V02TEST01"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.MEMBER))

        // 모임 계좌 등록
        groupAccountRepository.save(
            GroupAccount(
                groupId = group.id,
                bankName = "카카오뱅크",
                accountNumber = "3333-01-1234567",
                accountHolder = "모임장"
            )
        )
    }

    @Test
    @DisplayName("시나리오 1: 중도 참여자의 과거 일자 제외 및 정산 정합성 종합 검증")
    fun `중도 참여자의 과거 일자 제외 및 정산 정합성 종합 검증`() {
        // Given: 7일 챌린지 (startDate: 오늘 - 2일, endDate: 오늘 + 4일)
        val startDate = today.minusDays(2)
        val endDate = today.plusDays(4)
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "매일 아침 달리기 7일",
                description = "건강 습관 형성",
                verificationCriteria = "달리기 기록 앱 캡처",
                startDate = startDate,
                endDate = endDate
            )
        )

        // Host는 Day 1(오늘 - 2일)부터 참여
        val hostParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = hostUser.id,
                penaltyAmount = 5000,
                startDate = startDate
            )
        )
        // Host의 과거 일자(오늘-2, 오늘-1)는 미인증 FAILED 상태로 세팅
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = hostParticipant.id,
                userId = hostUser.id,
                date = today.minusDays(2),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = hostParticipant.id,
                userId = hostUser.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5000,
                depositStatus = DepositStatus.UNPAID
            )
        )

        // When: Member가 오늘(startDateType = TODAY, 즉 Day 3) 중도 참여
        val joinRequest = JoinChallengeRequest(
            penaltyAmount = 5000,
            startDateType = StartDateType.TODAY
        )
        mockMvc.post("/api/v1/challenges/${challenge.id}/participants") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
            content = objectMapper.writeValueAsString(joinRequest)
        }.andExpect {
            status { isCreated() }
        }

        // Then 1: Member의 DailyRecord는 과거 날짜(오늘-2, 오늘-1)에 생성되지 않고, 오늘부터 종료일까지 5개만 생성되어야 함
        val memberParticipant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, memberUser.id)
        assertNotNull(memberParticipant)
        val memberRecords = dailyRecordRepository.findAllByChallengeParticipantId(memberParticipant!!.id)
        assertEquals(5, memberRecords.size)
        assertTrue(memberRecords.none { it.date.isBefore(today) })
        assertTrue(memberRecords.any { it.date == today })
        assertTrue(memberRecords.any { it.date == endDate })

        // Then 2: 정산 요약 API 조회 시 Member의 미수행 벌금은 과거 날짜(10,000원)가 포함되지 않고 0원이어야 함
        mockMvc.get("/api/v1/groups/${group.id}/settlement-summary") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.myUnpaidAmount") { value(0) }
        }

        // Host는 과거 2일 미수행 벌금 10,000원이 온전히 집계되어야 함
        mockMvc.get("/api/v1/groups/${group.id}/settlement-summary") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.myUnpaidAmount") { value(10000) }
        }
    }

    @Test
    @DisplayName("시나리오 2: 인증 완료 후 공유 카드 발행, 외부 조회 격리 및 원본 삭제 시 차단 검증")
    fun `인증 완료 후 공유 카드 발행, 외부 조회 격리 및 원본 삭제 시 차단 검증`() {
        // Given: 챌린지 및 당일 레코드 생성
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "30일 독서 챌린지",
                description = "책 읽기",
                verificationCriteria = "책 사진과 페이지 인증",
                startDate = today,
                endDate = today.plusDays(6)
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = memberUser.id,
                penaltyAmount = 3000,
                startDate = today
            )
        )
        val record = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUser.id,
                date = today,
                status = DailyRecordStatus.COMPLETED
            )
        )
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = memberUser.id,
                targetDate = today,
                imageUrl = "https://dayuse.kr/images/test-verify.jpg",
                comment = "오늘 10페이지 완독!"
            )
        )
        record.verificationId = verification.id
        dailyRecordRepository.save(record)

        // When 1: Member가 인증 카드 공유 생성
        val createRes = mockMvc.post("/api/v1/shares/verifications/${verification.id}") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val shareToken = objectMapper.readTree(createRes).get("token").asText()
        assertNotNull(shareToken)

        // Then 1: 외부 비로그인 사용자(토큰 없음)가 공개 카드 조회 시 성공하되 민감 정보는 없어야 함
        mockMvc.get("/api/v1/public/shares/$shareToken")
            .andExpect {
                status { isOk() }
                jsonPath("$.userNickname") { value("도전자") }
                jsonPath("$.comment") { value("오늘 10페이지 완독!") }
                jsonPath("$.groupName") { doesNotExist() }
                jsonPath("$.accountNumber") { doesNotExist() }
                jsonPath("$.penaltyAmount") { doesNotExist() }
            }

        // When 2: 작성자가 공유 카드 해제 (삭제)
        mockMvc.delete("/api/v1/shares/$shareToken") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isNoContent() }
        }

        // Then 2: 해제 후 외부 공개 카드 조회 시 404 Not Found 확인
        mockMvc.get("/api/v1/public/shares/$shareToken")
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    @DisplayName("시나리오 3: 미인증 웹 푸시 스케줄링 및 1일 1회 발송 멱등성 검증")
    fun `미인증 웹 푸시 스케줄링 및 1일 1회 발송 멱등성 검증`() {
        // Given: Member의 푸시 구독 및 알림 켜기
        val subscriptionReq = RegisterPushSubscriptionRequest(
            endpoint = "https://fcm.googleapis.com/fcm/send/member-token-123",
            p256dh = "BMemberKeyP256dhBase64String==",
            auth = "MemberAuthStringBase64=="
        )
        mockMvc.post("/api/v1/notifications/subscriptions") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
            content = objectMapper.writeValueAsString(subscriptionReq)
        }.andExpect {
            status { isOk() }
        }

        val settingReq = UpdateNotificationSettingRequest(
            enabled = true,
            reminderTime = "21:00"
        )
        mockMvc.put("/api/v1/notifications/settings") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
            content = objectMapper.writeValueAsString(settingReq)
        }.andExpect {
            status { isOk() }
        }

        // 진행 중인 챌린지 생성
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "매일 물 마시기",
                description = "2리터 마시기",
                verificationCriteria = "물병 사진",
                startDate = today,
                endDate = today.plusDays(3)
            )
        )
        val memberParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser.id, penaltyAmount = 1000, startDate = today)
        )
        val hostParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = hostUser.id, penaltyAmount = 1000, startDate = today)
        )

        // Member는 미인증 (UNCHECKED), Host는 인증 완료 (COMPLETED)
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = memberParticipant.id,
                userId = memberUser.id,
                date = today,
                status = DailyRecordStatus.UNCHECKED
            )
        )
        dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = hostParticipant.id,
                userId = hostUser.id,
                date = today,
                status = DailyRecordStatus.COMPLETED
            )
        )

        // When 1: 21:00 정각 스케줄러 실행
        val scheduledTime = LocalDateTime.of(today, LocalTime.of(21, 0))
        notificationSchedulerService.processScheduledNotifications(scheduledTime)

        // Then 1: 미인증인 Member에게 1건 발송 성공, 이미 인증한 Host는 제외
        val logs1 = pushSendLogRepository.findAll()
        assertEquals(1, logs1.size)
        assertEquals(memberUser.id, logs1[0].userId)
        assertEquals(today, logs1[0].sendDate)

        // When 2: 같은 날 스케줄러 재실행
        notificationSchedulerService.processScheduledNotifications(scheduledTime.plusMinutes(5))

        // Then 2: 이미 당일 발송되었으므로 추가 발송 0건 (1일 1회 멱등성 보장)
        assertEquals(1, pushSendLogRepository.findAll().size)
    }

    @Test
    @DisplayName("시나리오 4: 종료된 챌린지 다시 시작 시 도메인 및 참여자 완전 격리 검증")
    fun `종료된 챌린지 다시 시작 시 도메인 및 참여자 완전 격리 검증`() {
        // Given: 종료된 챌린지 (과거 7일 챌린지)
        val pastStart = today.minusDays(8)
        val pastEnd = today.minusDays(1)
        val endedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "영어 단어 암기 7일",
                description = "하루 20개",
                verificationCriteria = "단어장 사진",
                startDate = pastStart,
                endDate = pastEnd
            )
        )
        // 과거 챌린지에는 Host와 Member 둘 다 참여했음
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = endedChallenge.id, userId = hostUser.id, penaltyAmount = 3000, startDate = pastStart)
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = endedChallenge.id, userId = memberUser.id, penaltyAmount = 3000, startDate = pastStart)
        )

        // When: Host가 재시작 API 호출 (새 시작일: 내일, 종료일: 내일 + 6일)
        val newStart = today.plusDays(1)
        val newEnd = newStart.plusDays(6)
        val restartReq = RestartChallengeRequest(
            title = "영어 단어 암기 7일 (시즌2)",
            description = "하루 20개 시즌2",
            verificationCriteria = "단어장 사진 시즌2",
            startDate = newStart,
            endDate = newEnd,
            myPenaltyAmount = 5000
        )

        val restartRes = mockMvc.post("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(restartReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val newChallengeId = objectMapper.readTree(restartRes).get("id").asLong()
        assertNotEquals(endedChallenge.id, newChallengeId)

        // Then 1: 새 챌린지 시작일과 종료일이 정상 설정됨
        val newChallenge = challengeRepository.findById(newChallengeId).orElseThrow()
        assertEquals("영어 단어 암기 7일 (시즌2)", newChallenge.title)
        assertEquals(newStart, newChallenge.startDate)
        assertEquals(newEnd, newChallenge.endDate)

        // Then 2: 새 챌린지의 참여자 목록에는 재시작 요청자인 Host만 존재하고, 이전 참여자였던 Member는 자동 복사되지 않음 (도메인 격리)
        val newParticipants = challengeParticipantRepository.findAllByChallengeId(newChallengeId)
        assertEquals(1, newParticipants.size)
        assertEquals(hostUser.id, newParticipants[0].userId)
        assertEquals(5000, newParticipants[0].penaltyAmount)

        // Then 3: 기존 종료된 챌린지의 참여자 수는 2명 그대로 온전히 유지됨 (기존 기록 불변)
        val oldParticipants = challengeParticipantRepository.findAllByChallengeId(endedChallenge.id)
        assertEquals(2, oldParticipants.size)
    }

    @Test
    @DisplayName("시나리오 5: 기존 v0.1 정산 신고 및 승인, IDOR 타 모임 접근 차단 회귀 검증")
    fun `기존 v0_1 정산 신고 및 승인, IDOR 타 모임 접근 차단 회귀 검증`() {
        // Given: 진행 중 챌린지 및 미납 벌금 생성
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "아침 기상 챌린지",
                description = "7시 기상",
                verificationCriteria = "기상 인증 사진",
                startDate = today.minusDays(1),
                endDate = today.plusDays(1)
            )
        )
        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser.id, penaltyAmount = 5000, startDate = today.minusDays(1))
        )
        val record = dailyRecordRepository.save(
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

        // When 1: Member가 입금 신고 생성
        val reportReq = CreateDepositReportRequest(
            depositorName = "도전자",
            depositDate = today,
            totalAmount = 5000,
            dailyRecordIds = listOf(record.id)
        )
        val reportRes = mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberToken)
            content = objectMapper.writeValueAsString(reportReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val reportId = objectMapper.readTree(reportRes).get("id").asLong()

        // Then 1: 일일 기록이 WAITING_CONFIRMATION 상태로 전이
        val underReviewRecord = dailyRecordRepository.findById(record.id).orElseThrow()
        assertEquals(DepositStatus.WAITING_CONFIRMATION, underReviewRecord.depositStatus)

        // When 2: Host가 입금 확인 승인
        mockMvc.post("/api/v1/deposit-reports/$reportId/confirm") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isOk() }
        }

        // Then 2: 일일 기록이 CONFIRMED 상태로 전이 완료
        val confirmedRecord = dailyRecordRepository.findById(record.id).orElseThrow()
        assertEquals(DepositStatus.CONFIRMED, confirmedRecord.depositStatus)

        // Then 3: IDOR 방어 - 모임에 속하지 않은 outsiderUser가 모임 챌린지 목록이나 정산 데이터에 접근 시 403 Forbidden 반환
        mockMvc.get("/api/v1/groups/${group.id}/settlement-summary") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }

        mockMvc.get("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }
    }
}
