package com.dayuse.domain.challenge

import org.springframework.data.jpa.repository.JpaRepository

interface ChallengeRepository : JpaRepository<Challenge, Long> {
    fun findAllByGroupIdOrderByStartDateAscCreatedAtDesc(groupId: Long): List<Challenge>
    fun findAllByGroupId(groupId: Long): List<Challenge>
}
