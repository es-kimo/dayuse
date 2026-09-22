@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.dailyrecord

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.global.jwt.JwtTokenProvider
import com.dayuse.global.util.DateTimeUtils
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DailyRecordIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var entityManager: jakarta.persistence.EntityManager

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
    private lateinit var dailyRecordService: DailyRecordService

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var memberUser: User
    private lateinit var strangerUser: User

    private lateinit var memberToken: String
    private lateinit var strangerToken: String

    private lateinit var group: Group
    private lateinit var challenge1: Challenge
    private lateinit var participant1: ChallengeParticipant

    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        memberUser = userRepository.save(User(kakaoId = "member_1", nickname = "모임원"))
        strangerUser = userRepository.save(User(kakaoId = "stranger_1", nickname = "외부인"))

        memberToken = jwtTokenProvider.generateAccessToken(memberUser.id)
        strangerToken = jwtTokenProvider.generateAccessToken(strangerUser.id)

        group = groupRepository.save(
            Group(name = "테스트 모임", hostUserId = memberUser.id, inviteCode = "INVITE-F06")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = memberUser.id, role = GroupRole.HOST)
        )

        // 2일 전 시작하여 10일 후 종료되는 챌린지
        challenge1 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = memberUser.id,
                title = "매일 아침 독서",
                description = "하루 10페이지 읽기",
                verificationCriteria = "책 사진 인증",
                startDate = today.minusDays(2),
                endDate = today.plusDays(10)
            )
        )
        participant1 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge1.id,
                userId = memberUser.id,
                penaltyAmount = 5000
            )
        )

        dailyRecordService.ensureDailyRecordsForParticipant(participant1, challenge1, today)
    }

    @Test
    fun `DoD 1 자정이 지난 미인증 날짜가 자동으로 벌금이 부과되지 않고 UNCHECKED로 남아 있다`() {
        // 미확인 2일 (today.minusDays(2), today.minusDays(1))
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.groupId") { value(group.id) }
            jsonPath("$.uncheckedCount") { value(2) }
            jsonPath("$.unpaidPenaltyAmount") { value(0) } // 벌금 미산입 확인
        }

        mockMvc.get("/api/v1/groups/${group.id}/unchecked-records") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
            jsonPath("$[0].status") { value("UNCHECKED") }
            jsonPath("$[0].penaltyAmount") { value(5000) }
            jsonPath("$[1].status") { value("UNCHECKED") }
        }
    }

    @Test
    fun `DoD 2 사용자가 미수행을 확정했을 때만 정확히 약정 금액이 미납금에 산입된다`() {
        val unchecked = dailyRecordRepository.findUncheckedRecords(memberUser.id, group.id, today)
        val targetRecord = unchecked.first()

        mockMvc.post("/api/v1/daily-records/${targetRecord.id}/mark-failed") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.id") { value(targetRecord.id) }
            jsonPath("$.status") { value("FAILED") }
            jsonPath("$.penaltyAmount") { value(5000) }
            jsonPath("$.failedAt") { isNotEmpty() }
        }

        // 요약 조회 시 미확인 건수는 1건으로 줄고, 미납 벌금은 5000원이 된다.
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.uncheckedCount") { value(1) }
            jsonPath("$.unpaidPenaltyAmount") { value(5000) }
        }
    }

    @Test
    fun `DoD 3 과거 미확인 또는 미수행 날짜에 늦은 인증을 올리면 완료로 변경되고 미납 벌금이 즉시 제외된다`() {
        val unchecked = dailyRecordRepository.findUncheckedRecords(memberUser.id, group.id, today)
        val targetRecord = unchecked.first()

        // 먼저 미수행 확정하여 벌금 5,000원 부과
        dailyRecordService.markFailed(targetRecord.id, memberUser.id)
        assertEquals(5000, dailyRecordRepository.calculateUnpaidPenaltyAmount(memberUser.id, group.id))

        // 늦은 인증 등록
        val lateRequest = LateVerificationRequest(
            imageUrl = "verifications/${challenge1.id}/${memberUser.id}/late_proof.jpg",
            comment = "어제 깜빡하고 못 올려서 늦게 제출합니다."
        )

        mockMvc.post("/api/v1/daily-records/${targetRecord.id}/verify-late") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(lateRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.isLate") { value(true) }
            jsonPath("$.targetDate") { value(targetRecord.date.toString()) }
        }

        val updatedRecord = dailyRecordRepository.findById(targetRecord.id).get()
        assertEquals(DailyRecordStatus.COMPLETED, updatedRecord.status)
        assertEquals(0, updatedRecord.penaltyAmount)
        assertTrue(updatedRecord.isLate)

        // 미납 벌금이 즉시 0원으로 복구되었는지 확인
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.unpaidPenaltyAmount") { value(0) }
        }
    }

    @Test
    fun `DoD 4 여러 챌린지를 미수행한 경우 각 챌린지의 약정 벌금이 정확히 누적 합산된다`() {
        // 두 번째 챌린지 생성 및 참여 (약정금 10,000원)
        val challenge2 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = memberUser.id,
                title = "매일 영단어 암기",
                description = "단어 20개 암기",
                verificationCriteria = "테스트 캡처",
                startDate = today.minusDays(1),
                endDate = today.plusDays(10)
            )
        )
        val participant2 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge2.id,
                userId = memberUser.id,
                penaltyAmount = 10000
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(participant2, challenge2, today)

        val record1 = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant1.id,
            today.minusDays(1)
        )!!
        val record2 = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant2.id,
            today.minusDays(1)
        )!!

        // 두 챌린지 모두 어제 날짜에 대해 미수행 확정
        dailyRecordService.markFailed(record1.id, memberUser.id)
        dailyRecordService.markFailed(record2.id, memberUser.id)

        // 합산 벌금: 5,000 + 10,000 = 15,000원
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.unpaidPenaltyAmount") { value(15000) }
        }
    }

    @Test
    fun `인증 삭제 시 오늘 인증은 WAITING으로 과거 인증은 UNCHECKED로 롤백된다`() {
        // 1. 오늘 인증 등록
        val todayRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant1.id,
            today
        )!!
        assertEquals(DailyRecordStatus.WAITING, todayRecord.status)

        val todayVerification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge1.id,
                userId = memberUser.id,
                targetDate = today,
                imageUrl = "verifications/${challenge1.id}/${memberUser.id}/today.jpg",
                isLate = false
            )
        )
        dailyRecordService.onVerificationCreated(todayVerification)
        assertEquals(DailyRecordStatus.COMPLETED, todayRecord.status)

        // 오늘 인증 삭제 -> WAITING 롤백
        mockMvc.delete("/api/v1/verifications/${todayVerification.id}") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isNoContent() }
        }
        assertEquals(DailyRecordStatus.WAITING, todayRecord.status)

        // 2. 어제 늦은 인증 등록
        val yesterdayRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant1.id,
            today.minusDays(1)
        )!!
        val lateVerification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge1.id,
                userId = memberUser.id,
                targetDate = today.minusDays(1),
                imageUrl = "verifications/${challenge1.id}/${memberUser.id}/late.jpg",
                isLate = true
            )
        )
        dailyRecordService.onVerificationCreated(lateVerification)
        assertEquals(DailyRecordStatus.COMPLETED, yesterdayRecord.status)

        // 과거 인증 삭제 -> UNCHECKED 롤백 (절대 FAILED가 아님)
        mockMvc.delete("/api/v1/verifications/${lateVerification.id}") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isNoContent() }
        }
        assertEquals(DailyRecordStatus.UNCHECKED, yesterdayRecord.status)
        assertEquals(0, yesterdayRecord.penaltyAmount)
    }

    @Test
    fun `정산 락(Lock) 상태인 기록은 미수행 확정 및 늦은 인증 및 인증 삭제가 차단된다`() {
        val targetRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant1.id,
            today.minusDays(1)
        )!!
        targetRecord.depositStatus = DepositStatus.WAITING_CONFIRMATION
        dailyRecordRepository.save(targetRecord)

        // 1. 미수행 확정 시도 -> 400
        mockMvc.post("/api/v1/daily-records/${targetRecord.id}/mark-failed") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isBadRequest() }
        }

        // 2. 늦은 인증 등록 시도 -> 400
        val lateRequest = LateVerificationRequest(
            imageUrl = "verifications/${challenge1.id}/${memberUser.id}/late.jpg"
        )
        mockMvc.post("/api/v1/daily-records/${targetRecord.id}/verify-late") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(lateRequest)
        }.andExpect {
            status { isBadRequest() }
        }

        // 3. 인증 연결 후 삭제 시도 -> 400
        targetRecord.depositStatus = DepositStatus.UNPAID
        dailyRecordRepository.save(targetRecord)

        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge1.id,
                userId = memberUser.id,
                targetDate = today.minusDays(1),
                imageUrl = "verifications/${challenge1.id}/${memberUser.id}/late.jpg"
            )
        )
        targetRecord.verifyLate(verification.id)
        targetRecord.depositStatus = DepositStatus.CONFIRMED
        dailyRecordRepository.save(targetRecord)

        mockMvc.delete("/api/v1/verifications/${verification.id}") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isBadRequest() }
        }
    }

    @Test
    fun `챌린지 캘린더 조회 시 5대 상태가 날짜별로 정확히 산출된다`() {
        mockMvc.get("/api/v1/challenges/${challenge1.id}/calendar") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.challengeId") { value(challenge1.id) }
            jsonPath("$.participants[0].userId") { value(memberUser.id) }
            jsonPath("$.participants[0].records.length()") { value(13) } // 2일 전 ~ 10일 후 = 13일
        }
    }

    @Test
    fun `모임 멤버가 아닌 외부인은 상태 요약 또는 캘린더 조회 시 403 Forbidden 차단된다`() {
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $strangerToken")
        }.andExpect {
            status { isForbidden() }
        }

        mockMvc.get("/api/v1/challenges/${challenge1.id}/calendar") {
            header("Authorization", "Bearer $strangerToken")
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `과거 날짜의 기록이 WAITING 상태(예 당일 인증 삭제 후 다음날 경과)여도 늦은 인증 등록이 정상 처리된다`() {
        // 이틀 전 날짜 기록을 WAITING 상태로 명시 설정 (자정 경과 시 DB에 남아있을 수 있는 상태)
        val twoDaysAgo = today.minusDays(2)
        val pastRecord = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant1.id,
            twoDaysAgo
        )!!
        pastRecord.status = DailyRecordStatus.WAITING
        dailyRecordRepository.save(pastRecord)

        val lateRequest = LateVerificationRequest(
            imageUrl = "verifications/${challenge1.id}/${memberUser.id}/late_after_rollback.jpg",
            comment = "늦은 인증 성공 테스트"
        )

        mockMvc.post("/api/v1/daily-records/${pastRecord.id}/verify-late") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(lateRequest)
        }.andExpect {
            status { isOk() }
            jsonPath("$.isLate") { value(true) }
            jsonPath("$.targetDate") { value(twoDaysAgo.toString()) }
        }

        val updated = dailyRecordRepository.findById(pastRecord.id).get()
        assertEquals(DailyRecordStatus.COMPLETED, updated.status)
        assertEquals(true, updated.isLate)
        assertEquals(0, updated.penaltyAmount)
    }
    @ParameterizedTest
    @EnumSource(value = DailyRecordStatus::class, names = ["PLANNED", "WAITING"])
    fun `과거 예정과 대기 기록은 조회 없이 늦은 인증할 수 있다`(storedStatus: DailyRecordStatus) {
        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant1.id, today.minusDays(2))!!
        record.status = storedStatus
        mockMvc.post("/api/v1/daily-records/${record.id}/verify-late") {
            header("Authorization", "Bearer $memberToken")
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(LateVerificationRequest(
                imageUrl = "verifications/${challenge1.id}/${memberUser.id}/planned.jpg"
            ))
        }.andExpect { status { isOk() } }
        assertEquals(DailyRecordStatus.COMPLETED, record.status)
        assertEquals(0, record.penaltyAmount)
    }

    @ParameterizedTest
    @EnumSource(value = DailyRecordStatus::class, names = ["PLANNED", "WAITING"])
    fun `과거 예정과 대기 기록은 조회 없이 미수행 확정할 수 있다`(storedStatus: DailyRecordStatus) {
        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant1.id, today.minusDays(2))!!
        record.status = storedStatus
        mockMvc.post("/api/v1/daily-records/${record.id}/mark-failed") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.status") { value("FAILED") }
            jsonPath("$.penaltyAmount") { value(5000) }
        }
    }

    @Test
    fun `미리 생성한 기록의 캘린더와 미확인 목록 및 건수가 일치하고 저장 상태는 유지된다`() {
        dailyRecordRepository.findAllByChallengeId(challenge1.id).forEach { it.status = DailyRecordStatus.PLANNED }
        mockMvc.get("/api/v1/challenges/${challenge1.id}/calendar") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.participants[0].records[0].status") { value("UNCHECKED") }
            jsonPath("$.participants[0].records[2].status") { value("WAITING") }
            jsonPath("$.participants[0].records[3].status") { value("PLANNED") }
        }
        mockMvc.get("/api/v1/groups/${group.id}/unchecked-records") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.length()") { value(2) }
            jsonPath("$[0].status") { value("UNCHECKED") }
            jsonPath("$[1].status") { value("UNCHECKED") }
        }
        mockMvc.get("/api/v1/groups/${group.id}/status-summary") {
            header("Authorization", "Bearer $memberToken")
        }.andExpect {
            status { isOk() }
            jsonPath("$.uncheckedCount") { value(2) }
            jsonPath("$.unpaidPenaltyAmount") { value(0) }
        }
        entityManager.flush()
        entityManager.clear()
        assertTrue(dailyRecordRepository.findAllByChallengeId(challenge1.id).all { it.status == DailyRecordStatus.PLANNED })
    }

    @Test
    fun `일반 인증 생성 후 연결에서도 과거 예정 기록을 완료한다`() {
        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(participant1.id, today.minusDays(2))!!
        record.status = DailyRecordStatus.PLANNED
        val verification = verificationRepository.save(Verification(
            groupId = group.id, challengeId = challenge1.id, userId = memberUser.id,
            targetDate = record.date, imageUrl = "verifications/${challenge1.id}/${memberUser.id}/callback.jpg", isLate = true
        ))
        dailyRecordService.onVerificationCreated(verification)
        assertEquals(DailyRecordStatus.COMPLETED, record.status)
        assertEquals(verification.id, record.verificationId)
    }

}
