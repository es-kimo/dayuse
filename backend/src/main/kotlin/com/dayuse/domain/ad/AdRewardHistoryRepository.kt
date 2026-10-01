package com.dayuse.domain.ad

import org.springframework.data.jpa.repository.JpaRepository

interface AdRewardHistoryRepository : JpaRepository<AdRewardHistory, Long> {

    fun findBySessionId(sessionId: Long): AdRewardHistory?

    fun findBySessionToken(sessionToken: String): AdRewardHistory?

    fun countBySessionId(sessionId: Long): Long
}
