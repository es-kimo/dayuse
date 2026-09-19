package com.dayuse.domain.challenge

import org.springframework.data.jpa.repository.JpaRepository

interface ChallengeRepository : JpaRepository<Challenge, Long> {
    fun findAllByGroupId(groupId: Long): List<Challenge>
    fun findAllByGroupIdOrderByStartDateAscCreatedAtDesc(groupId: Long): List<Challenge>
}
