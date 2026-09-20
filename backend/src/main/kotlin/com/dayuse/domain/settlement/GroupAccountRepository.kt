package com.dayuse.domain.settlement

import org.springframework.data.jpa.repository.JpaRepository

interface GroupAccountRepository : JpaRepository<GroupAccount, Long> {
    fun findByGroupId(groupId: Long): GroupAccount?
    fun existsByGroupId(groupId: Long): Boolean
}
