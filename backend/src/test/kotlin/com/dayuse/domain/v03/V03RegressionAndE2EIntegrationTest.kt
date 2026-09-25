@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.v03

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.dto.RestartChallengeRequest
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
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
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
import java.time.LocalDateTime

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class V03RegressionAndE2EIntegrationTest {

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
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var settlementService: SettlementService

    @Autowired
    private lateinit var notificationSchedulerService: NotificationSchedulerService

    @MockBean
    private lateinit var webPushClient: WebPushClient

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser1: User
    private lateinit var memberUser2: User
    private lateinit var outsiderUser: User

    private lateinit var hostToken: String
    private lateinit var memberToken1: String
    private lateinit var memberToken2: String
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

        hostUser = userRepository.save(User(kakaoId = "v03_host", nickname = "모임장"))
        memberUser1 = userRepository.save(User(kakaoId = "v03_member1", nickname = "성실러"))
        memberUser2 = userRepository.save(User(kakaoId = "v03_member2", nickname = "작심삼일"))
        outsiderUser = userRepository.save(User(kakaoId = "v03_outsider", nickname = "외부인"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken1 = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser1.id)
        memberToken2 = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser2.id)
        outsiderToken = "Bearer " + jwtTokenProvider.generateAccessToken(outsiderUser.id)

        group = groupRepository.save(
            Group(
                name = "v0.3 통합 및 릴리즈 검증 모임",
                hostUserId = hostUser.id,
                inviteCode = "V03INTEG01"
            )
        )

        groupMemberRepository.save(GroupMember(groupId = group.id, userId = hostUser.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser1.id, role = GroupRole.MEMBER))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = memberUser2.id, role = GroupRole.MEMBER))

        // 모임 계좌 등록
        settlementService.updateGroupAccount(
            groupId = group.id,
            userId = hostUser.id,
            request = GroupAccountRequest(
                bankName = "토스뱅크",
                accountNumber = "1000-01-999999",
                accountHolder = "모임장"
            )
        )
    }

    @Test
    @DisplayName("[E2E 복합 시나리오] 챌린지 생성 시 모임원 일괄 등록(개별 약정금) -> 주 3회 10일 챌린지 진행 -> 조기 달성, 초과 인증, 구간 종료 후 본인 확정, 입금 신고 및 승인, 다시 시작하기까지 완벽 검증")
    fun `v03 복합 유저 시나리오 E2E 통합 검증`() {
        // Step 1: 챌린지 생성 API로 모임원 일괄 등록 및 개별 벌금 설정 검증 (Section 8 - 조건 1, 2, 5, 6)
        val futureStart = today.plusDays(1)
        val futureEnd = futureStart.plusDays(9) // 10일 챌린지
        val createRequest = CreateChallengeRequest(
            title = "10일 완성 주 3회 헬스",
            verificationCriteria = "오운완 헬스장 사진 인증",
            startDate = futureStart,
            endDate = futureEnd,
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            myPenaltyAmount = 5000,
            participants = listOf(
                CreateParticipantRequest(userId = memberUser1.id, penaltyAmount = 10000),
                CreateParticipantRequest(userId = memberUser2.id, penaltyAmount = 3000)
            )
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(createRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.id") { exists() }
            jsonPath("$.periodType") { value("WEEKLY_N") }
            jsonPath("$.targetFrequency") { value(3) }
            jsonPath("$.durationDays") { value(10) }
            jsonPath("$.participants.length()") { value(3) }
        }

        // Step 2: 1구간(7일)이 자연스럽게 종료되고 2구간(3일)이 진행 중인 10일 챌린지 시뮬레이션
        // startDate: 8일 전, endDate: 1일 후 (총 10일)
        // 1구간: 8일 전 ~ 2일 전 (7일) -> 오늘 기준 종료 완료
        // 2구간: 1일 전 ~ 1일 후 (3일) -> 오늘 기준 진행 중
        val pastStart = today.minusDays(8)
        val pastEnd = today.plusDays(1)

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "진행 중인 10일 챌린지",
                description = "주 3회 헬스",
                verificationCriteria = "사진 인증",
                startDate = pastStart,
                endDate = pastEnd,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3
            )
        )

        val pHost = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = hostUser.id, penaltyAmount = 5000, startDate = pastStart)
        )
        val pMember1 = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser1.id, penaltyAmount = 10000, startDate = pastStart)
        )
        val pMember2 = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser2.id, penaltyAmount = 3000, startDate = pastStart)
        )

        // 일일 레코드 생성 (10일분)
        var curDate = pastStart
        while (!curDate.isAfter(pastEnd)) {
            dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = pHost.id, userId = hostUser.id, date = curDate))
            dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = pMember1.id, userId = memberUser1.id, date = curDate))
            dailyRecordRepository.save(DailyRecord(groupId = group.id, challengeId = challenge.id, challengeParticipantId = pMember2.id, userId = memberUser2.id, date = curDate))
            curDate = curDate.plusDays(1)
        }

        // 유저1(성실러): 1구간 중 4회 인증 (목표 3회 조기 달성 + 4일차 초과 인증, Section 8 - 조건 7)
        listOf(
            pastStart,
            pastStart.plusDays(1),
            pastStart.plusDays(2),
            pastStart.plusDays(3)
        ).forEach { date ->
            val v = verificationRepository.save(
                Verification(groupId = group.id, challengeId = challenge.id, userId = memberUser1.id, targetDate = date, imageUrl = "gym-$date.jpg")
            )
            dailyRecordRepository.findAllByChallengeId(challenge.id)
                .first { it.userId == memberUser1.id && it.date == date }
                .verifyToday(v.id)
        }

        // 유저2(작심삼일): 1구간 중 1회만 인증 (목표 3회 중 1회 수행, 2회 미달)
        val vMember2 = verificationRepository.save(
            Verification(groupId = group.id, challengeId = challenge.id, userId = memberUser2.id, targetDate = pastStart, imageUrl = "lazy.jpg")
        )
        dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUser2.id && it.date == pastStart }
            .verifyToday(vMember2.id)

        // Step 3: 오늘(1구간 종료 후) 상태 판정 확인 (Section 8 - 조건 6, 8, 9)
        // 유저1 상세 조회: 4회 인증으로 ACHIEVED 상태, 벌금 0원
        val detailMember1 = challengeService.getChallengeDetail(challenge.id, memberUser1.id, today)
        val p1_user1 = detailMember1.intervals!!.find { it.index == 1 }!!
        assertEquals(3, p1_user1.targetCount)
        assertEquals(4, p1_user1.completedCount)
        assertTrue(p1_user1.isAchieved)
        assertEquals(PeriodSettlementStatus.ACHIEVED, p1_user1.settlementStatus)
        assertEquals(0, p1_user1.missedCount)
        assertEquals(0, p1_user1.totalPenaltyAmount)

        // 유저2 상세 조회: 1회 인증으로 목표 미달 -> NEEDS_CONFIRMATION 상태, 부족분 2회 * 3,000원 = 6,000원
        val detailMember2 = challengeService.getChallengeDetail(challenge.id, memberUser2.id, today)
        val p1_user2 = detailMember2.intervals!!.find { it.index == 1 }!!
        assertEquals(3, p1_user2.targetCount)
        assertEquals(1, p1_user2.completedCount)
        assertFalse(p1_user2.isAchieved)
        assertEquals(PeriodSettlementStatus.NEEDS_CONFIRMATION, p1_user2.settlementStatus)
        assertEquals(2, p1_user2.missedCount)
        assertEquals(6000, p1_user2.totalPenaltyAmount)

        // 단축 2구간(3일간) 목표 검증: minOf(targetFrequency 3, daysInInterval 3) = 3 (Section 8 - 조건 7)
        val p2_detail = detailMember1.intervals!!.find { it.index == 2 }!!
        assertEquals(2, p2_detail.index)
        assertEquals(3, p2_detail.targetCount)

        // Step 4: 본인 확인 및 멱등성 검증 (Section 8 - 조건 8)
        // 타인(외부인)이 유저2의 1구간 확정 시도 -> 403 Forbidden
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/periods/1/confirm") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }

        // 진행 중인 2구간 확정 시도 -> 400 Bad Request ("진행 중인 구간은 확정할 수 없습니다")
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/periods/2/confirm") {
            header("Authorization", memberToken2)
        }.andExpect {
            status { isBadRequest() }
        }

        // 유저2 본인 확정 성공 -> CONFIRMED_FAILED 전이 및 6,000원 벌금 생성
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/periods/1/confirm") {
            header("Authorization", memberToken2)
        }.andExpect {
            status { isOk() }
            jsonPath("$.periodIndex") { value(1) }
            jsonPath("$.status") { value("CONFIRMED_FAILED") }
            jsonPath("$.missedCount") { value(2) }
            jsonPath("$.penaltyAmountPerMiss") { value(3000) }
            jsonPath("$.totalPenaltyAmount") { value(6000) }
        }

        val periodSettlement = challengePeriodSettlementRepository
            .findByChallengeParticipantIdAndPeriodIndex(pMember2.id, 1)!!
        val periodSettlementId = periodSettlement.id
        assertEquals(DepositStatus.UNPAID, periodSettlement.depositStatus)

        // 멱등성: 다시 확정 API 호출 시 중복 생성 없이 동일 결과 반환
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/periods/1/confirm") {
            header("Authorization", memberToken2)
        }.andExpect {
            status { isOk() }
            jsonPath("$.periodIndex") { value(1) }
            jsonPath("$.totalPenaltyAmount") { value(6000) }
        }

        // Step 5: 미납 벌금 조회 및 입금 신고 흐름 (Section 8 - 조건 8)
        mockMvc.get("/api/v1/groups/${group.id}/unpaid-records") {
            header("Authorization", memberToken2)
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(1) }
            jsonPath("$[0].isPeriod") { value(true) }
            jsonPath("$[0].penaltyAmount") { value(6000) }
            jsonPath("$[0].id") { value(periodSettlementId) }
        }

        // 유저2 입금 신고 생성
        val depositReportRequest = CreateDepositReportRequest(
            depositorName = "작심삼일유저",
            depositDate = today,
            dailyRecordIds = emptyList(),
            periodSettlementIds = listOf(periodSettlementId),
            totalAmount = 6000
        )

        val reportResponse = mockMvc.post("/api/v1/groups/${group.id}/deposit-reports") {
            header("Authorization", memberToken2)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(depositReportRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.status") { value("WAITING_CONFIRMATION") }
            jsonPath("$.totalAmount") { value(6000) }
            jsonPath("$.items.length()") { value(1) }
            jsonPath("$.items[0].isPeriod") { value(true) }
        }.andReturn()

        val reportId = objectMapper.readTree(reportResponse.response.contentAsString).get("id").asLong()

        // 모임장이 입금 신고 승인 -> CONFIRMED 완료 (중복 청구 방지)
        mockMvc.post("/api/v1/deposit-reports/$reportId/confirm") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("CONFIRMED") }
        }

        val settledPeriod = challengePeriodSettlementRepository.findById(periodSettlementId).orElseThrow()
        assertEquals(DepositStatus.CONFIRMED, settledPeriod.depositStatus)

        // Step 6: 다시 시작하기 시 가변 기간(10일)과 주기(WEEKLY_N, 3)가 그대로 반영됨 검증 (Section 8 - 조건 10)
        // 종료된 챌린지 생성
        val endedChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "10일 완성 주 3회 헬스 (시즌1)",
                description = "오운완",
                verificationCriteria = "인증 사진",
                startDate = today.minusDays(15),
                endDate = today.minusDays(6),
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 3
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = endedChallenge.id, userId = hostUser.id, penaltyAmount = 5000, startDate = today.minusDays(15))
        )

        val restartRequest = RestartChallengeRequest(
            title = "10일 완성 주 3회 헬스 (시즌2)",
            verificationCriteria = "오운완 사진",
            startDate = today.plusDays(1),
            endDate = today.plusDays(10),
            periodType = PeriodType.WEEKLY_N,
            targetFrequency = 3,
            myPenaltyAmount = 5000
        )

        mockMvc.post("/api/v1/groups/${group.id}/challenges/${endedChallenge.id}/restart") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(restartRequest)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.title") { value("10일 완성 주 3회 헬스 (시즌2)") }
            jsonPath("$.periodType") { value("WEEKLY_N") }
            jsonPath("$.targetFrequency") { value(3) }
            jsonPath("$.durationDays") { value(10) }
            jsonPath("$.startDate") { value(today.plusDays(1).toString()) }
            jsonPath("$.endDate") { value(today.plusDays(10).toString()) }
        }
    }

    @Test
    @DisplayName("[하위 호환 회귀 검증] v0.1/v0.2 매일형 14일 챌린지, 일일 인증 및 DailyRecord 정산의 무결성 보장")
    fun `기존 매일형 챌린지 및 DailyRecord 정산 회귀 검증`() {
        val startDate = today
        val endDate = today.plusDays(13) // 14일 챌린지

        // 매일형 챌린지 생성 (Section 8 - 조건 5, 11)
        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "매일 아침 독서",
                verificationCriteria = "책 1페이지 사진",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.DAILY,
                targetFrequency = null,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUser1.id, penaltyAmount = 5000)
                )
            ),
            today = startDate
        )

        // 1. 매일형 챌린지 상세 속성 확인
        val detail = challengeService.getChallengeDetail(challenge.id, memberUser1.id, startDate)
        assertEquals(PeriodType.DAILY, detail.periodType)
        assertNull(detail.targetFrequency)
        assertEquals(14, detail.totalTargetCount)
        assertNotNull(detail.intervals)

        // 2. 일일 인증 수행
        val v = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = memberUser1.id,
                targetDate = startDate,
                imageUrl = "book.jpg"
            )
        )
        val record = dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUser1.id && it.date == startDate }
        record.verifyToday(v.id)
        assertEquals(DailyRecordStatus.COMPLETED, record.status)

        // 3. 미인증 날짜의 벌금 부과 및 DailyRecord 입금 신고 연동
        val day2 = startDate.plusDays(1)
        val recordDay2 = dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUser1.id && it.date == day2 }
        recordDay2.status = DailyRecordStatus.FAILED
        recordDay2.penaltyAmount = 5000
        recordDay2.failedAt = LocalDateTime.now()
        dailyRecordRepository.save(recordDay2)

        val unpaidRecords = settlementService.getUnpaidRecords(group.id, memberUser1.id)
        assertTrue(unpaidRecords.any { !it.isPeriod && it.id == recordDay2.id })

        val depositReport = settlementService.createDepositReport(
            groupId = group.id,
            userId = memberUser1.id,
            request = CreateDepositReportRequest(
                depositorName = "성실러",
                depositDate = day2,
                dailyRecordIds = listOf(recordDay2.id),
                periodSettlementIds = emptyList(),
                totalAmount = 5000
            )
        )
        assertEquals(DepositReportStatus.WAITING_CONFIRMATION, depositReport.status)

        settlementService.confirmDepositReport(depositReport.id, hostUser.id)
        val refreshedRecord = dailyRecordRepository.findById(recordDay2.id).orElseThrow()
        assertEquals(DepositStatus.CONFIRMED, refreshedRecord.depositStatus)
    }

    @Test
    @DisplayName("[보안 및 IDOR 격리] 타인의 구간 정산 확정 차단 및 타 모임 리소스 결합 방어")
    fun `구간 정산 권한 격리 및 IDOR 방어 검증`() {
        val startDate = today.minusDays(7)
        val endDate = today.minusDays(1) // 종료된 주 1회 챌린지

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = hostUser.id,
                title = "주 1회 회고",
                verificationCriteria = "블로그 링크",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 1
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = memberUser1.id, penaltyAmount = 10000, startDate = startDate)
        )

        // 1. 모임에 속하지 않은 외부인이 확정 시도 시 403 Forbidden
        mockMvc.post("/api/v1/groups/${group.id}/challenges/${challenge.id}/periods/1/confirm") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isForbidden() }
        }

        // 2. 다른 모임 사용자의 침범 방어 (모임 불일치)
        val otherGroup = groupRepository.save(
            Group(name = "다른 모임", hostUserId = outsiderUser.id, inviteCode = "OTHER999")
        )
        groupMemberRepository.save(GroupMember(groupId = otherGroup.id, userId = outsiderUser.id, role = GroupRole.HOST))

        mockMvc.post("/api/v1/groups/${otherGroup.id}/challenges/${challenge.id}/periods/1/confirm") {
            header("Authorization", outsiderToken)
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    @DisplayName("[웹 푸시 알림 필터링 검증] 주 N회 구간 목표를 이미 달성한 유저는 당일 미인증 상태여도 알림 카운트에서 제외된다")
    fun `주 N회 목표 달성자 웹 푸시 필터링 검증`() {
        val startDate = today
        val endDate = today.plusDays(6)

        val challenge = challengeService.createChallenge(
            groupId = group.id,
            userId = hostUser.id,
            request = CreateChallengeRequest(
                title = "주 1회 운동",
                verificationCriteria = "운동 사진",
                startDate = startDate,
                endDate = endDate,
                periodType = PeriodType.WEEKLY_N,
                targetFrequency = 1,
                myPenaltyAmount = 5000,
                participants = listOf(
                    CreateParticipantRequest(userId = memberUser1.id, penaltyAmount = 5000),
                    CreateParticipantRequest(userId = memberUser2.id, penaltyAmount = 5000)
                )
            ),
            today = startDate
        )

        // 유저1: 시작일에 1회 인증 완료 -> 주 1회 목표 즉시 달성!
        val v = verificationRepository.save(
            Verification(groupId = group.id, challengeId = challenge.id, userId = memberUser1.id, targetDate = startDate, imageUrl = "v1.jpg")
        )
        dailyRecordRepository.findAllByChallengeId(challenge.id)
            .first { it.userId == memberUser1.id && it.date == startDate }
            .verifyToday(v.id)

        // 2일차 기준 (유저1과 유저2 모두 2일차 당일 기록은 미인증 상태)
        val day2 = startDate.plusDays(1)

        // 푸시 알림 카운트 검사:
        // 유저1은 2일차에 미인증이지만 주간 목표(1회)를 이미 달성했으므로 알림 카운트 0 (Section 8 - 조건 9)
        val pendingCountUser1 = notificationSchedulerService.countPendingChallenges(memberUser1.id, day2)
        assertEquals(0, pendingCountUser1)

        // 유저2는 아직 목표를 달성하지 못했으므로 알림 카운트 1
        val pendingCountUser2 = notificationSchedulerService.countPendingChallenges(memberUser2.id, day2)
        assertEquals(1, pendingCountUser2)
    }
}
