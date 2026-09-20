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
        user = userRepository.save(User(kakaoId = "tx_user", nickname = "트랜잭션테스터"))
        group = groupRepository.save(
            Group(name = "트랜잭션 모임", hostUserId = user.id, inviteCode = "INVITE-TX")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = user.id, role = GroupRole.HOST)
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
        dailyRecordService.ensureDailyRecordsForParticipant(participant, challenge, today)
    }

    @Test
    @Suppress("UNUSED_VARIABLE")
    fun `미수행 확정 후 늦은 인증 등록 시 벌금이 차감되는 트랜잭션 무결성 검증`() {
        val uncheckedRecords = dailyRecordRepository.findUncheckedRecords(user.id, group.id, today)
        val targetRecord = uncheckedRecords.first()

        // TODO [사용자 미션 3]: 미수행 확정 -> 늦은 인증 등록 시 벌금이 차감되고 상태가 정상 복구되는 트랜잭션 무결성을 검증하는 테스트 코드를 직접 작성하세요.
        // 1. dailyRecordService.markFailed(targetRecord.id, user.id)를 호출하고 반환된 결과의 status가 FAILED, penaltyAmount가 10000원인지 단언(assert)하세요.
        // 2. dailyRecordRepository.calculateUnpaidPenaltyAmount(user.id, group.id)가 10000원인지 단언하세요.
        // 3. LateVerificationRequest(imageUrl = "...", comment = "...")를 생성하여 dailyRecordService.verifyLate(targetRecord.id, user.id, lateRequest)를 호출하세요.
        // 4. 레코드를 DB에서 다시 조회(dailyRecordRepository.findById(targetRecord.id).get())하여 status == COMPLETED, penaltyAmount == 0, isLate == true인지 단언하세요.
        // 5. dailyRecordRepository.calculateUnpaidPenaltyAmount(user.id, group.id)가 0원으로 차감 복구되었는지 단언하세요.
        throw NotImplementedError("미션 3: 늦은 인증 벌금 차감 트랜잭션 무결성 검증 테스트를 직접 작성해보세요.")
    }
}
