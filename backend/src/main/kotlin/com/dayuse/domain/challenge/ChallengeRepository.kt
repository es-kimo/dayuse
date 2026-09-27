package com.dayuse.domain.challenge

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param

interface ChallengeRepository : JpaRepository<Challenge, Long> {
    fun findAllByGroupId(groupId: Long): List<Challenge>
    fun findAllByGroupIdOrderByStartDateAscCreatedAtDesc(groupId: Long): List<Challenge>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Challenge c WHERE c.id = :id")
    fun findByIdWithLock(@Param("id") id: Long): Challenge?
}
