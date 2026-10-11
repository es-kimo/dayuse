package com.dayuse.domain.coin

import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.Optional

interface CoinBalanceRepository : JpaRepository<CoinBalance, Long> {
    fun findByUserId(userId: Long): Optional<CoinBalance>

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT cb FROM CoinBalance cb WHERE cb.userId = :userId")
    fun findByUserIdForUpdate(@Param("userId") userId: Long): Optional<CoinBalance>

    @Query("SELECT COALESCE(SUM(cb.availableBalance), 0L) FROM CoinBalance cb")
    fun sumTotalAvailableBalance(): Long

    @Query("SELECT COALESCE(SUM(cb.heldBalance), 0L) FROM CoinBalance cb")
    fun sumTotalHeldBalance(): Long

    @Query("SELECT COUNT(cb) FROM CoinBalance cb WHERE cb.availableBalance >= :threshold")
    fun countUsersWithAvailableBalanceAtLeast(@Param("threshold") threshold: Int): Long
}

