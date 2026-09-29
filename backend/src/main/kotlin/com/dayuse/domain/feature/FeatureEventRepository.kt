package com.dayuse.domain.feature

import org.springframework.data.jpa.repository.JpaRepository

interface FeatureEventRepository : JpaRepository<FeatureEvent, Long> {
    fun findByFeatureKeyAndEventType(featureKey: String, eventType: String): List<FeatureEvent>
    fun findAllByUserId(userId: Long): List<FeatureEvent>
}
