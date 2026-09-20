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
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DailyRecordTransactionTest {

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

    private lateinit var user: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var participant: ChallengeParticipant

    private val today: LocalDate = DateTimeUtils.todayKst()

    @BeforeEach
    fun setUp() {
        user = userRepository.save(
            User(
                kakaoId = "tx_user",
                nickname = "트랜잭션테스터"
            )
        )
        group = groupRepository.save(
            Group(
                name = "트랜잭션 모임",
                hostUserId = user.id,
                inviteCode = "INVITE-TX"
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = user.id,
                role = GroupRole.HOST
            )
        )

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user.id,
                title = "매일 운동",
                verificationCriteria = "운동 사진",
                startDate = today.minusDays(3),
                endDate = today.plusDays(7)
            )
        )
        participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user.id,
                penaltyAmount = 10000
            )
        )
        dailyRecordService.ensureDailyRecordsForParticipant(
            participant,
            challenge,
            today
        )
    }

    @Test
    @Suppress("UNUSED_VARIABLE")
    fun `미수행 확정 후 늦은 인증 등록 시 벌금이 차감되는 트랜잭션 무결성 검증`() {
        val uncheckedRecords = dailyRecordRepository.findUncheckedRecords(
            user.id,
            group.id,
            today
        )
        val targetRecord = uncheckedRecords.first()

        val failedDetail = dailyRecordService.markFailed(
            targetRecord.id,
            user.id
        )
        assertEquals(
            DailyRecordStatus.FAILED,
            failedDetail.status
        )
        assertEquals(
            10000,
            failedDetail.penaltyAmount
        )

        val unpaidAfterFailed = dailyRecordRepository.calculateUnpaidPenaltyAmount(
            user.id,
            group.id
        )
        assertEquals(
            10000,
            unpaidAfterFailed
        )

        val lateRequest = LateVerificationRequest(
            imageUrl = "verifications/${challenge.id}/${user.id}/tx_late.jpg",
            comment = "늦은 인증 완료"
        )
        dailyRecordService.verifyLate(
            targetRecord.id,
            user.id,
            lateRequest
        )

        val completedRecord = dailyRecordRepository.findById(targetRecord.id).get()
        assertEquals(
            DailyRecordStatus.COMPLETED,
            completedRecord.status
        )
        assertEquals(
            0,
            completedRecord.penaltyAmount
        )
        assertTrue(completedRecord.isLate)

        val unpaidAfterLate = dailyRecordRepository.calculateUnpaidPenaltyAmount(
            user.id,
            group.id
        )
        assertEquals(
            0,
            unpaidAfterLate
        )
    }
}
