package com.dayuse.domain.experiment

import org.springframework.data.jpa.repository.JpaRepository

interface ExperimentRepository : JpaRepository<Experiment, Long> {
    fun findByExperimentKey(experimentKey: String): Experiment?

    fun existsByExperimentKey(experimentKey: String): Boolean

    fun findAllByStatusOrderByCreatedAtDesc(status: ExperimentStatus): List<Experiment>

    fun findAllByOrderByCreatedAtDesc(): List<Experiment>
}
