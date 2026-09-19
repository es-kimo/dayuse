package com.dayuse.domain.group

import org.springframework.data.jpa.repository.JpaRepository

interface GroupRepository : JpaRepository<Group, Long> {
    fun findByInviteCode(inviteCode: String): Group?
}
