@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.today

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
import com.dayuse.domain.today.service.TodayService
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
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TodayTogetherAndAbortTest {

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
    private lateinit var todayService: TodayService

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        userA = userRepository.save(User(kakaoId = "today_user_a", nickname = "민수"))
        userB = userRepository.save(User(kakaoId = "today_user_b", nickname = "영희"))

        group = groupRepository.save(
            Group(
                name = "오늘 모임",
                hostUserId = userA.id,
                inviteCode = "TODAY-TEST"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userA.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userB.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `중단된 챌린지는 오늘 할 일(getAllTodayActions, getTodayActions)에서 즉시 제외된다`() {
        val today = DateTimeUtils.todayKst()

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "중단된 챌린지",
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

        // 중단 전에는 목록에 1건 조회됨
        val beforeAbortAll = todayService.getAllTodayActions(userA.id)
        assertEquals(1, beforeAbortAll.size)

        // 챌린지 중단
        challenge.abort(userA.id, "중단 사유")
        challengeRepository.save(challenge)

        // 중단 후에는 오늘 할 일 목록에서 즉시 제외됨
        val afterAbortAll = todayService.getAllTodayActions(userA.id)
        assertTrue(afterAbortAll.isEmpty(), "중단된 챌린지는 전체 오늘 할 일에서 제외되어야 합니다.")

        val afterAbortGroup = todayService.getTodayActions(group.id, userA.id)
        assertTrue(afterAbortGroup.isEmpty(), "중단된 챌린지는 모임 오늘 할 일에서 제외되어야 합니다.")
    }

    @Test
    fun `함께하기 챌린지에서 다른 참가자가 인증하면 오늘 완료 및 실제 인증자 닉네임이 바인딩된다`() {
        val today = DateTimeUtils.todayKst()

        val togetherChallenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "함께 산책하기",
                description = "설명",
                verificationCriteria = "발자국 사진",
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

        // 영희(userB)가 먼저 인증을 등록함
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = togetherChallenge.id,
                userId = userB.id,
                targetDate = today,
                imageUrl = "park.jpg",
                comment = "오늘 산책 완료",
                isLate = false
            )
        )

        // 민수(userA) 관점에서 오늘 할 일 조회
        val actions = todayService.getAllTodayActions(userA.id)
        assertEquals(1, actions.size)

        val action = actions[0]
        assertTrue(action.isCompletedToday, "영희가 인증했으므로 민수 관점에서도 오늘은 완료 상태여야 합니다.")
        assertTrue(action.isJointlyCompleted, "함께하기 공동 완료 플래그가 true여야 합니다.")
        assertEquals("영희", action.todayVerifierNickname, "실제 오늘 인증을 수행한 영희의 닉네임이 바인딩되어야 합니다.")
        assertEquals(ExecutionType.TOGETHER, action.executionType)
    }
}
