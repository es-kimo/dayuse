package com.dayuse.domain.feature

import org.springframework.data.jpa.repository.JpaRepository

interface FeatureAssignmentRepository : JpaRepository<FeatureAssignment, Long> {
    fun findByUserIdAndFeatureKey(userId: Long, featureKey: String): FeatureAssignment?
    fun findAllByFeatureKey(featureKey: String): List<FeatureAssignment>
}
