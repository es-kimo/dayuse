package com.dayuse.domain

import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.test.context.ActiveProfiles

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
}
