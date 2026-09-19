// 테스트 시나리오를 한글 이름으로 표현합니다.
@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationComment
import com.dayuse.domain.verification.VerificationCommentRepository
import com.dayuse.domain.verification.VerificationRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate

@DataJpaTest
@ActiveProfiles("test")
class EntityAndRelationshipTest {

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
    private lateinit var verificationCommentRepository: VerificationCommentRepository

    @Autowired
    private lateinit var entityManager: TestEntityManager

    @Test
    fun `User 엔티티 저장 및 JPA Auditing 필드 확인`() {
        val user = User(kakaoId = "kakao_12345", nickname = "테스트유저")
        val savedUser = userRepository.save(user)
        entityManager.flush()

        assertNotNull(savedUser.id)
        assertEquals("테스트유저", savedUser.nickname)
        assertNotNull(savedUser.createdAt)
        assertNotNull(savedUser.updatedAt)
    }

    @Test
    fun `Group 엔티티 저장 및 초대 코드 확인`() {
        val group = Group(
            name = "모각코 모임",
            hostUserId = 1L,
            inviteCode = "INVITE-UUID-1234"
        )
        val savedGroup = groupRepository.save(group)
        entityManager.flush()

        assertNotNull(savedGroup.id)
        assertEquals("모각코 모임", savedGroup.name)
        assertEquals("INVITE-UUID-1234", savedGroup.inviteCode)
    }

    @Test
    fun `GroupMember 저장 및 역할(HOST, MEMBER) 확인`() {
        val member = GroupMember(
            groupId = 10L,
            userId = 20L,
            role = GroupRole.HOST
        )
        val savedMember = groupMemberRepository.save(member)
        entityManager.flush()

        assertNotNull(savedMember.id)
        assertEquals(GroupRole.HOST, savedMember.role)
    }

    @Test
    fun `GroupMember (groupId, userId) 복합 유니크 제약조건 위반 시 DataIntegrityViolationException 발생`() {
        val member1 = GroupMember(groupId = 100L, userId = 200L, role = GroupRole.HOST)
        groupMemberRepository.save(member1)
        entityManager.flush()

        assertThrows(DataIntegrityViolationException::class.java) {
            val member2 = GroupMember(groupId = 100L, userId = 200L, role = GroupRole.MEMBER)
            groupMemberRepository.save(member2)
            entityManager.flush()
        }
    }

    @Test
    fun `Challenge 엔티티 저장 및 기본 필드 확인`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 2L,
            title = "14일 챌린지",
            description = "매일 운동",
            verificationCriteria = "운동 사진",
            startDate = LocalDate.of(2026, 10, 1),
            endDate = LocalDate.of(2026, 10, 14)
        )
        val saved = challengeRepository.save(challenge)
        entityManager.flush()

        assertNotNull(saved.id)
        assertEquals("14일 챌린지", saved.title)
        assertEquals(LocalDate.of(2026, 10, 1), saved.startDate)
        assertEquals(LocalDate.of(2026, 10, 14), saved.endDate)
        assertNotNull(saved.createdAt)
    }

    @Test
    fun `ChallengeParticipant (challengeId, userId) 복합 유니크 제약조건 위반 시 DataIntegrityViolationException 발생`() {
        val participant1 = ChallengeParticipant(challengeId = 50L, userId = 60L, penaltyAmount = 5000)
        challengeParticipantRepository.save(participant1)
        entityManager.flush()

        assertThrows(DataIntegrityViolationException::class.java) {
            val participant2 = ChallengeParticipant(challengeId = 50L, userId = 60L, penaltyAmount = 10000)
            challengeParticipantRepository.save(participant2)
            entityManager.flush()
        }
    }

    @Test
    fun `Verification (challengeId, userId, targetDate) 복합 유니크 제약조건 위반 시 DataIntegrityViolationException 발생`() {
        val date = LocalDate.of(2026, 9, 19)
        val v1 = Verification(
            groupId = 1L,
            challengeId = 10L,
            userId = 20L,
            targetDate = date,
            imageUrl = "https://s3.example.com/v1.jpg",
            comment = "1차 인증"
        )
        verificationRepository.save(v1)
        entityManager.flush()

        assertThrows(DataIntegrityViolationException::class.java) {
            val v2 = Verification(
                groupId = 1L,
                challengeId = 10L,
                userId = 20L,
                targetDate = date,
                imageUrl = "https://s3.example.com/v2.jpg",
                comment = "동일 날짜 중복 인증 시도"
            )
            verificationRepository.save(v2)
            entityManager.flush()
        }
    }

    @Test
    fun `Verification과 VerificationComment 간의 지연 로딩(FetchType LAZY) 확인`() {
        val verification = Verification(
            groupId = 1L,
            challengeId = 10L,
            userId = 20L,
            targetDate = LocalDate.of(2026, 9, 19),
            imageUrl = "https://s3.example.com/test.jpg",
            comment = "오늘 인증"
        )
        val savedVerification = verificationRepository.save(verification)

        val comment = VerificationComment(
            verification = savedVerification,
            userId = 30L,
            content = "멋집니다 파이팅!"
        )
        verificationCommentRepository.save(comment)
        entityManager.flush()
        entityManager.clear()

        // 1차 캐시를 비운 뒤 지연 로딩 검증
        val loadedVerification = verificationRepository.findById(savedVerification.id).get()
        assertNotNull(loadedVerification)

        // comments 컬렉션이 즉시 초기화되지 않고 프록시 상태(LAZY)인지 확인
        val persistenceUnitUtil = entityManager.entityManager.entityManagerFactory.persistenceUnitUtil
        assertFalse(persistenceUnitUtil.isLoaded(loadedVerification, "comments"), "comments는 LAZY로 설정되어 즉시 로딩되지 않아야 합니다.")

        // 실제로 접근 시 초기화(지연 로딩 발생)
        assertEquals(1, loadedVerification.comments.size)
        assertTrue(persistenceUnitUtil.isLoaded(loadedVerification, "comments"), "comments 접근 시점에 로딩되어야 합니다.")
    }
}
