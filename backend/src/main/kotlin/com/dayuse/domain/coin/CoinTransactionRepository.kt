package com.dayuse.domain.coin

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import java.time.LocalDate
import java.util.Optional

interface CoinTransactionRepository : JpaRepository<CoinTransaction, Long> {
    fun existsByIdempotencyKey(idempotencyKey: String): Boolean

    fun findByIdempotencyKey(idempotencyKey: String): Optional<CoinTransaction>

    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long, pageable: Pageable): Page<CoinTransaction>

    fun findAllByUserIdOrderByCreatedAtDesc(userId: Long): List<CoinTransaction>

    fun findAllByStatusOrderByCreatedAtDesc(status: CoinTransactionStatus): List<CoinTransaction>

    fun findAllByUserIdAndTargetDate(userId: Long, targetDate: LocalDate): List<CoinTransaction>

    fun findAllByUserId(userId: Long): List<CoinTransaction>
}
