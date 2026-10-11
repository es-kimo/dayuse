package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChallengeResultAcknowledgmentTest {

    @Autowired
    private lateinit var challengeResultService: ChallengeResultService

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var challengeResultRepository: ChallengeResultRepository

    @Autowired
    private lateinit var challengeParticipantResultRepository: ChallengeParticipantResultRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var userRepository: UserRepository

    private lateinit var user1: User
    private lateinit var user2: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge
    private lateinit var participant1: ChallengeParticipant

    @BeforeEach
    fun setUp() {
        user1 = userRepository.save(User(kakaoId = "k101", nickname = "사용자1", profileImageUrl = null))
        user2 = userRepository.save(User(kakaoId = "k102", nickname = "사용자2", profileImageUrl = null))

        group = groupRepository.save(Group(name = "테스트 모임", hostUserId = user1.id, inviteCode = "INV-ACK-101"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = user1.id, role = GroupRole.HOST))
        // user2는 모임 멤버 아님

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user1.id,
                title = "1주일 매일 챌린지",
                verificationCriteria = "인증 기준",
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY,
                startDate = LocalDate.now().minusDays(8),
                endDate = LocalDate.now().minusDays(1)
            )
        )

        participant1 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = user1.id,
                startDate = challenge.startDate,
                penaltyAmount = 1000
            )
        )
    }

    @Test
    @DisplayName("잠정 결과(PROVISIONAL) 상태에서는 확인(acknowledge) 처리를 시도하면 BadRequestException이 발생한다")
    fun acknowledge_provisional_shouldFail() {
        val result = challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.PROVISIONAL,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                achievementRate = 100.0,
                isSuccess = true
            )
        )

        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = result.id,
                challengeId = challenge.id,
                challengeParticipantId = participant1.id,
                userId = user1.id,
                groupId = group.id,
                targetCount = 7,
                completedCount = 7,
                achievementRate = 100.0,
                isSuccess = true
            )
        )

        assertThatThrownBy {
            challengeResultService.acknowledgeResult(group.id, challenge.id, user1.id)
        }.isInstanceOf(BadRequestException::class.java)
            .hasMessageContaining("잠정 결과는 확정 전까지 확인 완료 처리할 수 없습니다")
    }

    @Test
    @DisplayName("확정 결과(CONFIRMED) 상태에서는 확인(acknowledge) 시 정상적으로 acknowledgedAt 및 revision이 기록된다")
    fun acknowledge_confirmed_success() {
        val result = challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                revision = 1
            )
        )

        val partResult = challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = result.id,
                challengeId = challenge.id,
                challengeParticipantId = participant1.id,
                userId = user1.id,
                groupId = group.id,
                targetCount = 7,
                completedCount = 7,
                achievementRate = 100.0,
                isSuccess = true
            )
        )

        val response = challengeResultService.acknowledgeResult(group.id, challenge.id, user1.id)

        assertThat(response.isAcknowledged).isTrue()
        assertThat(response.isRevised).isFalse()
        assertThat(response.acknowledgedAt).isNotNull()

        val saved = challengeParticipantResultRepository.findById(partResult.id).get()
        assertThat(saved.isAcknowledged(result.revision)).isTrue()
        assertThat(saved.acknowledgedRevision).isEqualTo(1)
    }

    @Test
    @DisplayName("결과 보정으로 revision이 증가하면 이전에 확인했던 결과도 재확인 대상(isRevised=true, isAcknowledged=false)이 된다")
    fun acknowledge_revisedResult_shouldRequireReacknowledgment() {
        val result = challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                revision = 1
            )
        )

        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = result.id,
                challengeId = challenge.id,
                challengeParticipantId = participant1.id,
                userId = user1.id,
                groupId = group.id,
                targetCount = 7,
                completedCount = 7,
                achievementRate = 100.0,
                isSuccess = true
            )
        )

        // 1차 확인 완료
        challengeResultService.acknowledgeResult(group.id, challenge.id, user1.id)

        // 관리자 또는 시스템에 의한 결과 보정 (revision 증가)
        result.revise()
        challengeResultRepository.save(result)

        // 조회 시 isRevised=true, isAcknowledged=false 확인
        val summary = challengeResultService.getEndedChallengesSummary(user1.id)
        assertThat(summary.unacknowledgedCount).isEqualTo(1)
        val item = summary.items.first { it.challengeId == challenge.id }
        assertThat(item.isAcknowledged).isFalse()
        assertThat(item.isRevised).isTrue()

        // 재확인 처리
        val reAckResponse = challengeResultService.acknowledgeResult(group.id, challenge.id, user1.id)
        assertThat(reAckResponse.isAcknowledged).isTrue()
        assertThat(reAckResponse.isRevised).isFalse()

        // 다시 요약 조회 시 미확인 건수 0
        val reSummary = challengeResultService.getEndedChallengesSummary(user1.id)
        assertThat(reSummary.unacknowledgedCount).isEqualTo(0)
    }

    @Test
    @DisplayName("모임 멤버가 아닌 사용자가 acknowledge를 호출하면 ForbiddenException이 발생한다")
    fun acknowledge_nonMember_forbidden() {
        challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                isSuccess = true
            )
        )

        assertThatThrownBy {
            challengeResultService.acknowledgeResult(group.id, challenge.id, user2.id)
        }.isInstanceOf(ForbiddenException::class.java)
    }

    @Test
    @DisplayName("중단된 챌린지(ABORTED)는 확인 가능하고 사유가 요약에 반환된다")
    fun acknowledge_aborted_success() {
        val abortedResult = challengeResultRepository.save(
            ChallengeResult(
                challengeId = challenge.id,
                groupId = group.id,
                status = ChallengeResultStatus.ABORTED,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 3,
                abortReason = "관리자 사유로 중단",
                abortedAt = LocalDateTime.now()
            )
        )

        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = abortedResult.id,
                challengeId = challenge.id,
                challengeParticipantId = participant1.id,
                userId = user1.id,
                groupId = group.id,
                targetCount = 7,
                completedCount = 3,
                isSuccess = false
            )
        )

        val beforeSummary = challengeResultService.getEndedChallengesSummary(user1.id)
        assertThat(beforeSummary.unacknowledgedCount).isEqualTo(1)
        assertThat(beforeSummary.items.first().abortReason).isEqualTo("관리자 사유로 중단")

        val ackResponse = challengeResultService.acknowledgeResult(group.id, challenge.id, user1.id)
        assertThat(ackResponse.isAcknowledged).isTrue()

        val afterSummary = challengeResultService.getEndedChallengesSummary(user1.id)
        assertThat(afterSummary.unacknowledgedCount).isEqualTo(0)
    }
}
