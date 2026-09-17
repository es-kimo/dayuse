package com.dayuse.domain.group

import org.springframework.data.jpa.repository.JpaRepository

interface GroupMemberRepository : JpaRepository<GroupMember, Long> {
    fun findByGroupIdAndUserId(groupId: Long, userId: Long): GroupMember?
    fun existsByGroupIdAndUserId(groupId: Long, userId: Long): Boolean
    fun findAllByUserId(userId: Long): List<GroupMember>
    fun findAllByGroupId(groupId: Long): List<GroupMember>
    fun countByGroupId(groupId: Long): Long
}
