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
}
