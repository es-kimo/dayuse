@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.ChallengeDetailResponse
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.mock.mockito.MockBean
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TogetherChallengeAggregationTest {

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
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var verificationService: VerificationService

    @Autowired
    private lateinit var dailyRecordService: DailyRecordService

    @MockBean
    private lateinit var presignedUrlService: PresignedUrlService

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var participantA: ChallengeParticipant
    private lateinit var participantB: ChallengeParticipant

    @BeforeEach
    fun setUp() {
        userA = userRepository.save(User(kakaoId = "kakao_agg_a", nickname = "참가자A"))
        userB = userRepository.save(User(kakaoId = "kakao_agg_b", nickname = "참가자B"))

        group = groupRepository.save(
            Group(name = "공동 집계 테스트 모임", hostUserId = userA.id, inviteCode = "TOGETHER-AGG-01")
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userA.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userB.id, role = GroupRole.MEMBER))

        val today = DateTimeUtils.todayKst()
        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "매일 1명 물마시기",
                verificationCriteria = "물 한 컵 사진",
                startDate = today,
                endDate = today.plusDays(13), // 14일
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.TOGETHER
            )
        )

        participantA = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 0, startDate = challenge.startDate)
        )
        participantB = challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userB.id, penaltyAmount = 0, startDate = challenge.startDate)
        )

        dailyRecordService.ensureDailyRecordsForParticipant(participantA, challenge, today)
        dailyRecordService.ensureDailyRecordsForParticipant(participantB, challenge, today)

        `when`(presignedUrlService.generatePresignedGetUrl(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyLong(), org.mockito.ArgumentMatchers.anyLong()))
            .thenReturn("https://test-presigned-url.com")
    }

    @Test
    fun `F02-1 한 명의 인증으로 공동 목표가 달성되고 개인 통계가 올바르게 분리된다`() {
        val today = DateTimeUtils.todayKst()

        // 참가자 A가 오늘 인증 등록
        val verificationResponse = verificationService.createVerification(
            userId = userA.id,
            request = CreateVerificationRequest(
                challengeId = challenge.id,
                targetDate = today,
                imageUrl = "challenges/${challenge.id}/${userA.id}/test1.jpg",
                comment = "참가자 A 인증 완료"
            )
        )
        assertNotNull(verificationResponse)

        // 챌린지 상세 조회
        val detail = challengeService.getChallengeDetail(challenge.id, userA.id, today)
        assertEquals(1, detail.totalCompletedCount, "공동 수행일수는 1일이어야 합니다.")

        // 참가자별 개인 통계 분리 검증
        val pA = detail.participants.find { it.userId == userA.id }!!
        val pB = detail.participants.find { it.userId == userB.id }!!

        assertEquals(7, pA.completionRate, "실제 인증한 참가자 A의 달성률은 1/14(7%)이어야 합니다.")
        assertEquals(0, pB.completionRate, "직접 인증하지 않은 참가자 B의 개인 달성률은 0%이어야 합니다.")

        // 참가자 B의 당일 일일 기록은 공동 완료 상태여야 함
        val recordB = dailyRecordRepository.findByChallengeParticipantIdAndDate(participantB.id, today)!!
        assertEquals(DailyRecordStatus.COMPLETED, recordB.status, "공동 목표 달성으로 일일 기록은 COMPLETED여야 합니다.")
        assertNull(recordB.verificationId, "타 참가자 명의로 가짜 인증 ID를 매핑하지 않습니다.")
    }

    @Test
    fun `F02-2 동일 날짜에 다중 인증 등록 시 공동 수행일은 1일로만 계산된다`() {
        val today = DateTimeUtils.todayKst()

        // 1. 참가자 A 인증 등록
        verificationService.createVerification(
            userId = userA.id,
            request = CreateVerificationRequest(
                challengeId = challenge.id,
                targetDate = today,
                imageUrl = "challenges/${challenge.id}/${userA.id}/test1.jpg"
            )
        )

        // 2. 동일한 날짜에 참가자 B도 인증 등록
        verificationService.createVerification(
            userId = userB.id,
            request = CreateVerificationRequest(
                challengeId = challenge.id,
                targetDate = today,
                imageUrl = "challenges/${challenge.id}/${userB.id}/test2.jpg"
            )
        )

        // 검증: 인증 데이터는 각각 2건 저장됨
        val allVerifications = verificationRepository.findAllByChallengeIdAndTargetDate(challenge.id, today)
        assertEquals(2, allVerifications.size, "각 참가자의 원본 인증 2건이 모두 보존되어야 합니다.")

        // 검증: 챌린지 공동 수행일은 중복 없이 1일이어야 함
        val detail = challengeService.getChallengeDetail(challenge.id, userA.id, today)
        assertEquals(1, detail.totalCompletedCount, "동일 날짜 2건 인증 시에도 공동 수행일은 1일로 계산되어야 합니다.")

        // 이제 참가자 B도 본인이 직접 인증했으므로 completionRate가 7%가 되어야 함
        val pB = detail.participants.find { it.userId == userB.id }!!
        assertEquals(7, pB.completionRate)
    }

    @Test
    fun `F02-3 인증 삭제 시 타 참가자 인증이 남아있으면 완료 유지, 마지막 인증 삭제 시 완료 취소된다`() {
        val today = DateTimeUtils.todayKst()

        // 1. A와 B 둘 다 인증 등록
        val vA = verificationService.createVerification(
            userId = userA.id,
            request = CreateVerificationRequest(challengeId = challenge.id, targetDate = today, imageUrl = "testA.jpg")
        )
        val vB = verificationService.createVerification(
            userId = userB.id,
            request = CreateVerificationRequest(challengeId = challenge.id, targetDate = today, imageUrl = "testB.jpg")
        )

        // 2. A가 인증 삭제 -> B의 인증이 남아있으므로 공동 완료(1일) 유지
        verificationService.deleteVerification(vA.id, userA.id)

        var detail = challengeService.getChallengeDetail(challenge.id, userA.id, today)
        assertEquals(1, detail.totalCompletedCount, "B의 유효 인증이 남아있으므로 공동 달성은 유지되어야 합니다.")

        val recordA = dailyRecordRepository.findByChallengeParticipantIdAndDate(participantA.id, today)!!
        assertEquals(DailyRecordStatus.COMPLETED, recordA.status, "A의 기록도 여전히 공동 완료 상태여야 합니다.")
        assertNull(recordA.verificationId, "A 본인의 인증은 삭제되었으므로 verificationId는 null이어야 합니다.")

        // 3. B마저 인증 삭제 -> 남은 인증이 없으므로 공동 달성 취소 (0일)
        verificationService.deleteVerification(vB.id, userB.id)

        detail = challengeService.getChallengeDetail(challenge.id, userA.id, today)
        assertEquals(0, detail.totalCompletedCount, "마지막 인증이 삭제되면 공동 수행일수는 0일로 취소되어야 합니다.")

        val rolledBackRecordA = dailyRecordRepository.findByChallengeParticipantIdAndDate(participantA.id, today)!!
        val rolledBackRecordB = dailyRecordRepository.findByChallengeParticipantIdAndDate(participantB.id, today)!!
        assertEquals(DailyRecordStatus.WAITING, rolledBackRecordA.status)
        assertEquals(DailyRecordStatus.WAITING, rolledBackRecordB.status)
    }
}
