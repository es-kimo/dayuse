package com.dayuse.domain.analytics

import org.springframework.data.jpa.repository.JpaRepository

interface ProductEventRepository : JpaRepository<ProductEvent, Long> {
    fun existsByEventId(eventId: String): Boolean
    fun findByEventId(eventId: String): ProductEvent?
}
