package com.dayuse.domain.group

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

/**
 * [사용자 미션 1-3] GroupMember 엔티티 설계 및 구현 (핵심 학습 과제)
 *
 * 🎓 핵심 질문:
 * 1. User와 Group 사이의 N:M 관계를 왜 GroupMember라는 연결 엔티티로 매핑했나요?
 * 2. groupId와 userId의 복합 유니크 제약조건(uk_group_user)을 DB 레벨에 왜 걸어야 할까요?
 *
 * 요구사항:
 * - id: Long (PK, AUTO_INCREMENT)
 * - groupId: Long (Group 참조)
 * - userId: Long (User 참조)
 * - role: GroupRole (HOST, MEMBER)
 * - joinedAt: LocalDateTime
 * - 제약조건: groupId + userId 복합 유니크 인덱스 (중복 가입 방어)
 */
@Entity
@Table(
    name = "group_members"
    // TODO [사용자 미션 1-3]: groupId와 userId의 복합 유니크 제약조건(UniqueConstraint)을 직접 추가해 보세요!
    // 힌트: uniqueConstraints = [UniqueConstraint(name = "uk_group_user", columnNames = ["groupId", "userId"])]
)
class GroupMember(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(nullable = false)
    val groupId: Long = 0L,

    @Column(nullable = false)
    val userId: Long = 0L,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    var role: GroupRole = GroupRole.MEMBER,

    @Column(nullable = false)
    val joinedAt: LocalDateTime = LocalDateTime.now()
) : BaseTimeEntity()
