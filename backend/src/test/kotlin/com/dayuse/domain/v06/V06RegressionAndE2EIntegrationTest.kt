@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v06

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.AbortChallengeRequest
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.StartDateType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.period.ChallengePeriodSettlementRepository
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.notification.service.NotificationSchedulerService
import com.dayuse.domain.notification.service.PushSendResult
import com.dayuse.domain.notification.service.WebPushClient
import com.dayuse.domain.settlement.DepositReportRepository
import com.dayuse.domain.settlement.DepositReportStatus
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.share.ShareCardRepository
import com.dayuse.domain.today.service.TodayService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
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
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V06RegressionAndE2EIntegrationTest {

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
    private lateinit var challengePeriodSettlementRepository: ChallengePeriodSettlementRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var depositReportRepository: DepositReportRepository

    @Autowired
    private lateinit var shareCardRepository: ShareCardRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var verificationService: VerificationService

    @Autowired
    private lateinit var todayService: TodayService

    @Autowired
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @Autowired
    private lateinit var settlementService: SettlementService

    @MockBean
    private lateinit var webPushClient: WebPushClient

    @MockBean
    private lateinit var presignedUrlService: PresignedUrlService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUserA: User
    private lateinit var memberUserB: User
    private lateinit var outsiderUser: User

    private lateinit var hostToken: String
    private lateinit var memberAToken: String
    private lateinit var memberBToken: String
    private lateinit var outsiderToken: String

    private lateinit var group: Group
    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        Mockito.`when`(
            webPushClient.send(
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString(),
                Mockito.anyString()
            )
        ).thenReturn(PushSendResult(statusCode = 200, isSuccess = true, isExpired = false))

        Mockito.`when`(
            presignedUrlService.generatePresignedGetUrl(
                Mockito.any(),
                Mockito.anyLong(),
                Mockito.anyLong()
            )
        ).thenAnswer { invocation -> invocation.arguments[0] as? String ?: "" }

        hostUser = userRepository.save(User(nickname = "모임장호스트", kakaoId = "host_v06_${System.nanoTime()}"))
        memberUserA = userRepository.save(User(nickname = "도전자A", kakaoId = "memberA_v06_${System.nanoTime()}"))
        memberUserB = userRepository.save(User(nickname = "도전자B", kakaoId = "memberB_v06_${System.nanoTime()}"))
        outsiderUser = userRepository.save(User(nickname = "외부인", kakaoId = "outsider_v06_${System.nanoTime()}"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberAToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUserA.id)
        memberBToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUserB.id)
        outsiderToken = "Bearer " + jwtTokenProvider.generateAccessToken(outsiderUser.id)

        group = groupRepository.save(
            Group(
                name = "v0.6 함께하기 및 최종 검증 모임",
                hostUserId = hostUser.id,
                inviteCode = "INVITEV06"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUserA.id, role = GroupRole.MEMBER))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUserB.id, role = GroupRole.MEMBER))
    }

    @Test
    @DisplayName("v0.6 E2E 시나리오 1: 함께하기 생성, 중간 참여, 1인 인증으로 공동 완료, 리마인더 제외, 중단 및 정산 제외, 다시 만들기 전체 수명주기 검증")
    fun `함께하기 전체 라이프사이클 E2E 검증`() {
        // 1. 함께하기 챌린지 생성 (호스트가 생성하고 본인 및 멤버A 참여)
        val createReq = CreateChallengeRequest(
            title = "우리 모임 매일 산책하기",
            description = "팀원 중 누구든 한 명만 산책하면 미션 성공!",
            verificationCriteria = "산책 인증 사진",
            startDate = today,
            endDate = today.plusDays(13), // 14일
            periodType = PeriodType.DAILY,
            targetFrequency = 1,
            executionType = ExecutionType.TOGETHER,
            participants = listOf(
                CreateParticipantRequest(userId = hostUser.id, penaltyAmount = 0),
                CreateParticipantRequest(userId = memberUserA.id, penaltyAmount = 0)
            )
        )

        val createdRes = mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(createReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val challengeId = objectMapper.readTree(createdRes).get("id").asLong()
        val executionTypeStr = objectMapper.readTree(createdRes).get("executionType").asText()
        assertEquals("TOGETHER", executionTypeStr)

        // 2. 도중에 멤버B 중간 합류
        val joinReq = JoinChallengeRequest(
            startDateType = StartDateType.TODAY,
            penaltyAmount = 0
        )
        mockMvc.post("/api/v1/challenges/$challengeId/participants") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberBToken)
            content = objectMapper.writeValueAsString(joinReq)
        }.andExpect {
            status { isCreated() }
        }

        // 3. 멤버A가 오늘 인증 등록
        val verifyReq = CreateVerificationRequest(
            challengeId = challengeId,
            imageUrl = "https://dayuse.kr/images/dog-walk.jpg",
            comment = "강아지와 저녁 산책 완료!",
            targetDate = today
        )
        mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberAToken)
            content = objectMapper.writeValueAsString(verifyReq)
        }.andExpect {
            status { isCreated() }
        }

        // 4. 모임 피드 및 오늘 할 일 조회 시 공동 완료 및 실제 인증자(도전자A) 노출 확인
        val todayActionsHost = todayService.getAllTodayActions(hostUser.id)
        val todayAction = todayActionsHost.find { it.challengeId == challengeId }
        assertNotNull(todayAction)
        assertTrue(todayAction!!.isCompletedToday)
        assertEquals("도전자A", todayAction.todayVerifierNickname)

        val todayActionsMemberB = todayService.getAllTodayActions(memberUserB.id)
        val actionB = todayActionsMemberB.find { it.challengeId == challengeId }
        assertNotNull(actionB)
        assertTrue(actionB!!.isCompletedToday)
        assertEquals("도전자A", actionB.todayVerifierNickname)

        // 5. 알림 스케줄러: 당일 공동 인증이 완료되었으므로 잔여 미인증 건수 = 0, 리마인더 발송 스킵
        val pendingCountForHost = notificationSchedulerService.countPendingChallenges(hostUser.id, today)
        assertEquals(0, pendingCountForHost)

        val pendingCountForMemberB = notificationSchedulerService.countPendingChallenges(memberUserB.id, today)
        assertEquals(0, pendingCountForMemberB)

        // 6. 같은 날 다른 멤버(멤버B)가 추가 인증을 올리더라도 게시물은 보존되나 당일 수행은 1일로 유지됨
        val verifyReqB = CreateVerificationRequest(
            challengeId = challengeId,
            imageUrl = "https://dayuse.kr/images/dog-walk-night.jpg",
            comment = "밤에도 추가로 산책했어요",
            targetDate = today
        )
        mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberBToken)
            content = objectMapper.writeValueAsString(verifyReqB)
        }.andExpect {
            status { isCreated() }
        }

        val detailRes = challengeService.getChallengeDetail(challengeId, hostUser.id, today)
        // 같은 날 2건의 인증이 등록되었으나 수행일수는 1일
        assertEquals(1, detailRes.totalCompletedCount)

        // 7. 모임장(호스트)이 챌린지 중단
        val abortReq = AbortChallengeRequest(reason = "일정 상 조기 종료합니다")
        mockMvc.post("/api/v1/challenges/$challengeId/abort") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(abortReq)
        }.andExpect {
            status { isOk() }
        }

        // 8. 중단 후 상태 확인
        val abortedChallenge = challengeRepository.findById(challengeId).orElseThrow()
        assertTrue(abortedChallenge.isAborted())
        assertEquals(hostUser.id, abortedChallenge.abortedBy)
        assertEquals("일정 상 조기 종료합니다", abortedChallenge.abortReason)
        assertNotNull(abortedChallenge.abortedAt)

        // 9. 중단 후 신규 인증 시도 시 400 Bad Request 차단
        mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", hostToken)
            content = objectMapper.writeValueAsString(verifyReq)
        }.andExpect {
            status { isBadRequest() }
        }

        // 10. 오늘 할 일에서 중단된 챌린지 즉시 제외 확인
        val afterAbortActions = todayService.getAllTodayActions(hostUser.id)
        assertNull(afterAbortActions.find { it.challengeId == challengeId })

        // 11. 다시 만들기(Restart Template) 호출 시 설정 복제 확인
        val restartTemplate = challengeService.getRestartTemplate(group.id, challengeId, hostUser.id, today)
        assertEquals("우리 모임 매일 산책하기", restartTemplate.title)
        assertEquals(ExecutionType.TOGETHER, restartTemplate.executionType)
        assertEquals(0, restartTemplate.suggestedPenaltyAmount)
        assertEquals(today.plusDays(1), restartTemplate.suggestedStartDate)
        assertEquals(today.plusDays(14), restartTemplate.suggestedEndDate)
    }

    @Test
    @DisplayName("v0.6 엣지 케이스 2: KST 날짜 경계선(자정 전후) 및 심야 유예시간 인증 및 지각 판별 검증")
    fun `날짜 경계선 및 심야 유예시간 지각 판별 검증`() {
        val baseDate = LocalDate.of(2026, 10, 10)

        // 1. 대상 날짜 당일 23:59:59 제출 -> 정상 (false)
        val onTimeSubmitted = baseDate.atTime(23, 59, 59)
        assertFalse(DateTimeUtils.isLateVerification(baseDate, onTimeSubmitted))

        // 2. 대상 날짜 익일 새벽 00:00:01 제출 -> 정상 (false, 익일 09:00 이전이므로 유예)
        val graceSubmitted = baseDate.plusDays(1).atTime(0, 0, 1)
        assertFalse(DateTimeUtils.isLateVerification(baseDate, graceSubmitted))

        // 3. 대상 날짜 익일 08:59:59 제출 -> 정상 (false, 유예 마감 직전)
        val graceDeadlineSubmitted = baseDate.plusDays(1).atTime(8, 59, 59)
        assertFalse(DateTimeUtils.isLateVerification(baseDate, graceDeadlineSubmitted))

        // 4. 대상 날짜 익일 09:00:01 제출 -> 지각 (true)
        val lateSubmitted = baseDate.plusDays(1).atTime(9, 0, 1)
        assertTrue(DateTimeUtils.isLateVerification(baseDate, lateSubmitted))

        // 5. 미래 날짜 인증 요청 시 400 Bad Request 차단 확인
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "경계 조건 테스트 챌린지",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(2),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUserA.id, startDate = today.minusDays(2))
        )

        val futureVerifyReq = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://dayuse.kr/images/future.jpg",
            comment = "내일 인증 미리하기",
            targetDate = today.plusDays(1)
        )

        mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberAToken)
            content = objectMapper.writeValueAsString(futureVerifyReq)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    @DisplayName("v0.6 엣지 케이스 3: 주 N회 7일 윈도우 및 불완전 마지막 주기(3일 남음) 비례 목표치 계산 및 정산 제외 검증")
    fun `주 N회 불완전 마지막 주기 비례 계산 및 중단 시 정산 제외 검증`() {
        // 총 10일 기간의 주 5회 챌린지: 1주기(7일) 목표 5회, 2주기(3일) 목표 min(5, 3) = 3회
        val start = LocalDate.of(2026, 10, 1)
        val end = LocalDate.of(2026, 10, 10)
        val currentDate = LocalDate.of(2026, 10, 9) // 2주기(10.8 ~ 10.10) 진행 중

        val completedDates = setOf(
            LocalDate.of(2026, 10, 1),
            LocalDate.of(2026, 10, 2),
            LocalDate.of(2026, 10, 3),
            LocalDate.of(2026, 10, 4),
            LocalDate.of(2026, 10, 5), // 1주기 5회 완료
            LocalDate.of(2026, 10, 8),
            LocalDate.of(2026, 10, 9)  // 2주기 2회 완료
        )

        val result = ChallengePeriodCalculator.calculate(
            challengeStartDate = start,
            challengeEndDate = end,
            participantStartDate = start,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 5,
            completedDates = completedDates,
            today = currentDate,
            executionType = ExecutionType.TOGETHER
        )

        assertEquals(2, result.intervals.size)

        // 1주기(7일간): 목표 5회, 수행 5회 -> 달성
        val cycle1 = result.intervals[0]
        assertEquals(1, cycle1.index)
        assertEquals(7, java.time.temporal.ChronoUnit.DAYS.between(cycle1.startDate, cycle1.endDate) + 1)
        assertEquals(5, cycle1.targetCount)
        assertEquals(5, cycle1.completedCount)
        assertTrue(cycle1.isAchieved)

        // 2주기(3일간 불완전 주기): 목표 min(5, 3) = 3회, 현재 2회 진행 중
        val cycle2 = result.intervals[1]
        assertEquals(2, cycle2.index)
        assertEquals(3, java.time.temporal.ChronoUnit.DAYS.between(cycle2.startDate, cycle2.endDate) + 1)
        assertEquals(3, cycle2.targetCount)
        assertEquals(2, cycle2.completedCount)
        assertFalse(cycle2.isAchieved)

        // 만약 2주기 진행 중 중단(abort)된다면, 진행 중 주기는 총 목표치에서 제외됨
        val abortedResult = ChallengePeriodCalculator.calculate(
            challengeStartDate = start,
            challengeEndDate = end,
            participantStartDate = start,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 5,
            completedDates = completedDates,
            today = currentDate,
            executionType = ExecutionType.TOGETHER,
            abortedDate = currentDate
        )

        // 중단 시 완료된 1구간의 목표(5회)만 반영되고 진행 중이던 2구간 목표(3회)는 totalTarget에서 제외됨
        assertEquals(5, abortedResult.totalTargetCount)
        assertEquals(100, abortedResult.progressRate)
    }

    @Test
    @DisplayName("v0.6 동시성 4: 복수 참가자의 동시 당일 인증 등록 시 1일 1회 공동 반영 보장 검증")
    fun `동시 인증 요청 시 1일 1회 공동 반영 무결성 보장`() {
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "동시성 공동 인증 챌린지",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = hostUser.id, startDate = today.minusDays(1))
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUserA.id, startDate = today.minusDays(1))
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUserB.id, startDate = today.minusDays(1))
        )

        // 3명의 서로 다른 참가자가 같은 날 각각 인증을 등록
        val reqHost = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://dayuse.kr/images/concurrency-host.jpg",
            comment = "동시 인증 시도 from 호스트",
            targetDate = today
        )
        val reqA = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://dayuse.kr/images/concurrency-a.jpg",
            comment = "동시 인증 시도 from 도전자A",
            targetDate = today
        )
        val reqB = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://dayuse.kr/images/concurrency-b.jpg",
            comment = "동시 인증 시도 from 도전자B",
            targetDate = today
        )

        verificationService.createVerification(hostUser.id, reqHost)
        verificationService.createVerification(memberUserA.id, reqA)
        verificationService.createVerification(memberUserB.id, reqB)

        // 동일 사용자의 동일 날짜 중복 인증은 409 차단 검증
        org.junit.jupiter.api.assertThrows<com.dayuse.global.exception.DuplicateResourceException> {
            verificationService.createVerification(hostUser.id, reqHost)
        }

        // 각 사용자는 자신 명의의 인증을 등록할 수 있으므로 3개의 인증이 존재
        val verifications = verificationRepository.findAllByChallengeId(challenge.id)
        assertEquals(3, verifications.size)

        // 그러나 챌린지의 당일 공동 집계는 1일 1회만 반영됨
        val detail = challengeService.getChallengeDetail(challenge.id, hostUser.id, today)
        assertEquals(1, detail.totalCompletedCount)
    }

    @Test
    @DisplayName("v0.6 보안 및 권한 5: 일반 참가자의 중단 호출 차단(403) 및 타 모임 사용자의 정보 접근 차단(IDOR)")
    fun `권한 가드 및 IDOR 차단 검증`() {
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "보안 검증 챌린지",
                verificationCriteria = "인증 사진",
                startDate = today,
                endDate = today.plusDays(7),
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUserA.id, startDate = today)
        )

        val abortReq = AbortChallengeRequest(reason = "일반 참가자의 무단 중단 시도")

        // 1. 일반 참가자(memberUserA)가 중단 API 호출 시 403 Forbidden 차단
        mockMvc.post("/api/v1/challenges/${challenge.id}/abort") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberAToken)
            content = objectMapper.writeValueAsString(abortReq)
        }.andExpect {
            status { isForbidden() }
        }

        // 2. 모임 외부인(outsiderUser)이 챌린지 상세 접근 시 403 Forbidden 차단
        mockMvc.get("/api/v1/challenges/${challenge.id}") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    @DisplayName("v0.6 회귀 방어 6: 기존 각자하기(INDIVIDUAL) 챌린지의 벌금 정산, 일별 미인증, 입금 신고 정상 작동 회귀 검증")
    fun `기존 각자하기 챌린지 정산 및 연속 기록 정상 회귀 검증`() {
        // 0. 모임 계좌 등록
        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = com.dayuse.domain.settlement.dto.GroupAccountRequest(
                bankName = "카카오뱅크",
                accountNumber = "3333-01-1234567",
                accountHolder = "모임장호스트"
            )
        )

        // 1. 각자하기 챌린지 생성
        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "개인별 영단어 암기",
                verificationCriteria = "단어장 사진",
                startDate = today.minusDays(2),
                endDate = today.plusDays(4),
                periodType = PeriodType.DAILY,
                targetFrequency = 1,
                executionType = ExecutionType.INDIVIDUAL
            )
        )

        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = memberUserA.id,
                penaltyAmount = 5_000,
                startDate = today.minusDays(2)
            )
        )

        // 2. 과거 일자(어제) 미인증으로 인한 벌금 DailyRecord 생성
        val yesterdayRecord = dailyRecordRepository.save(
            DailyRecord(
                groupId = group.id,
                challengeId = challenge.id,
                challengeParticipantId = participant.id,
                userId = memberUserA.id,
                date = today.minusDays(1),
                status = DailyRecordStatus.FAILED,
                penaltyAmount = 5_000,
                depositStatus = DepositStatus.UNPAID
            )
        )

        // 3. 오늘 정상 인증 등록
        val verifyReq = CreateVerificationRequest(
            challengeId = challenge.id,
            imageUrl = "https://dayuse.kr/images/vocab.jpg",
            comment = "오늘 30단어 암기 완료",
            targetDate = today
        )
        mockMvc.post("/api/v1/verifications") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberAToken)
            content = objectMapper.writeValueAsString(verifyReq)
        }.andExpect {
            status { isCreated() }
        }

        // 오늘 할 일에서 본인 인증 완료 확인 및 verifierNickname은 null (개인 챌린지)
        val todayActions = todayService.getAllTodayActions(memberUserA.id)
        val myAction = todayActions.find { it.challengeId == challenge.id }
        assertNotNull(myAction)
        assertTrue(myAction!!.isCompletedToday)
        assertNull(myAction.todayVerifierNickname)

        // 4. 어제 미인증 벌금에 대한 입금 신고 등록 (정상 처리 회귀 확인)
        val reportReq = CreateDepositReportRequest(
            depositorName = "도전자A",
            depositDate = today,
            totalAmount = 5_000,
            dailyRecordIds = listOf(yesterdayRecord.id)
        )

        val reportRes = mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            contentType = MediaType.APPLICATION_JSON
            header("Authorization", memberAToken)
            content = objectMapper.writeValueAsString(reportReq)
        }.andExpect {
            status { isCreated() }
        }.andReturn().response.contentAsString

        val reportId = objectMapper.readTree(reportRes).get("id").asLong()
        assertNotNull(reportId)

        val savedReport = depositReportRepository.findById(reportId).orElseThrow()
        assertEquals(DepositReportStatus.WAITING_CONFIRMATION, savedReport.status)
        assertEquals(5_000, savedReport.totalAmount)
    }
}
