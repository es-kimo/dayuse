@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.share

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
import com.dayuse.domain.share.service.ShareCardService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ShareCardTogetherTest {

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
    private lateinit var shareCardService: ShareCardService

    private lateinit var userA: User
    private lateinit var userB: User
    private lateinit var userC: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        userA = userRepository.save(User(kakaoId = "share_user_a", nickname = "민수"))
        userB = userRepository.save(User(kakaoId = "share_user_b", nickname = "영희"))
        userC = userRepository.save(User(kakaoId = "share_user_c", nickname = "철수"))

        group = groupRepository.save(
            Group(
                name = "공유 모임",
                hostUserId = userA.id,
                inviteCode = "SHARE-TEST"
            )
        )
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userA.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = userB.id, role = GroupRole.MEMBER))
    }

    @Test
    fun `함께하기 챌린지에서는 다른 참여자가 등록한 인증도 같은 챌린지 참여자가 공유 카드를 생성할 수 있다`() {
        val today = DateTimeUtils.todayKst()

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "함께 조깅",
                description = "설명",
                verificationCriteria = "조깅 인증",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 0)
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userB.id, penaltyAmount = 0)
        )

        // 민수(userA)가 인증 등록
        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = today,
                imageUrl = "jogging.jpg",
                comment = "오늘 3km 달렸어요",
                isLate = false
            )
        )

        // 영희(userB)가 해당 인증으로 공유 카드 생성 요청
        val shareResponse = shareCardService.createVerificationShare(
            userId = userB.id,
            verificationId = verification.id
        )

        assertNotNull(shareResponse)
        assertEquals("영희", shareResponse.userNickname, "공유를 요청한 주체는 영희여야 합니다.")
        assertEquals("민수", shareResponse.actualVerifierNickname, "실제 인증자는 민수로 명시되어야 합니다.")
        assertEquals(ExecutionType.TOGETHER, shareResponse.executionType)

        // 퍼블릭 조회 검증
        val publicCard = shareCardService.getPublicShareCard(shareResponse.token)
        assertEquals("영희", publicCard.userNickname)
        assertEquals("민수", publicCard.actualVerifierNickname)
        assertEquals(ExecutionType.TOGETHER, publicCard.executionType)
    }

    @Test
    fun `각자하기 챌린지에서는 타인의 인증으로 공유 카드를 생성할 수 없다`() {
        val today = DateTimeUtils.todayKst()

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "각자 독서",
                description = "설명",
                verificationCriteria = "책 인증",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                executionType = ExecutionType.INDIVIDUAL
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 1000)
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userB.id, penaltyAmount = 1000)
        )

        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = today,
                imageUrl = "book.jpg",
                comment = "독서 완료",
                isLate = false
            )
        )

        // 영희(userB)가 각자하기 인증으로 공유 시도 -> Forbidden
        assertThrows<ForbiddenException> {
            shareCardService.createVerificationShare(
                userId = userB.id,
                verificationId = verification.id
            )
        }
    }

    @Test
    fun `챌린지 비참여자는 함께하기 챌린지여도 공유 카드를 생성할 수 없다`() {
        val today = DateTimeUtils.todayKst()

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userA.id,
                title = "함께 등산",
                description = "설명",
                verificationCriteria = "정상 인증",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                executionType = ExecutionType.TOGETHER
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = userA.id, penaltyAmount = 0)
        )

        val verification = verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = challenge.id,
                userId = userA.id,
                targetDate = today,
                imageUrl = "mountain.jpg",
                comment = "정상 도착!",
                isLate = false
            )
        )

        // 철수(userC)는 챌린지 비참여자 -> Forbidden
        assertThrows<ForbiddenException> {
            shareCardService.createVerificationShare(
                userId = userC.id,
                verificationId = verification.id
            )
        }
    }
}
