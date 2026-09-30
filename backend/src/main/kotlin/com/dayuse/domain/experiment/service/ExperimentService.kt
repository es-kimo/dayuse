package com.dayuse.domain.experiment.service

import com.dayuse.domain.experiment.Experiment
import com.dayuse.domain.experiment.ExperimentFallbackPolicy
import com.dayuse.domain.experiment.ExperimentRepository
import com.dayuse.domain.experiment.ExperimentResolution
import com.dayuse.domain.experiment.ExperimentStatus
import com.dayuse.domain.experiment.dto.ExperimentCreateRequest
import com.dayuse.domain.experiment.dto.ExperimentResponse
import com.dayuse.global.exception.DuplicateResourceException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * Experiment 정의·상태 전이 및 Fallback 판정 서비스. (F01, F08)
 */
@Service
class ExperimentService(
    private val experimentRepository: ExperimentRepository
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun createExperiment(
        request: ExperimentCreateRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ExperimentResponse {
        val experiment = Experiment.create(
            experimentKey = request.experimentKey,
            name = request.name,
            rolloutPercentage = request.rolloutPercentage,
            variantARatio = request.variantARatio,
            variantBRatio = request.variantBRatio,
            createdAt = now
        )

        if (experimentRepository.existsByExperimentKey(experiment.experimentKey)) {
            throw DuplicateResourceException(
                "이미 존재하는 experimentKey입니다. 기존 키를 재사용하지 말고 새 버전 키를 발급하세요: ${experiment.experimentKey}"
            )
        }

        val saved = try {
            experimentRepository.saveAndFlush(experiment)
        } catch (ex: DataIntegrityViolationException) {
            throw DuplicateResourceException(
                "이미 존재하는 experimentKey입니다. 기존 키를 재사용하지 말고 새 버전 키를 발급하세요: ${experiment.experimentKey}"
            )
        }

        return ExperimentResponse.from(saved)
    }

    @Transactional(readOnly = true)
    fun getExperiment(experimentKey: String): ExperimentResponse {
        val experiment = findExperimentOrThrow(experimentKey)
        return ExperimentResponse.from(experiment)
    }

    @Transactional(readOnly = true)
    fun listExperiments(status: ExperimentStatus? = null): List<ExperimentResponse> {
        val experiments = if (status != null) {
            experimentRepository.findAllByStatusOrderByCreatedAtDesc(status)
        } else {
            experimentRepository.findAllByOrderByCreatedAtDesc()
        }
        return experiments.map { ExperimentResponse.from(it) }
    }

    /**
     * DRAFT -> ACTIVE 상태 전이 및 `startedAt` 기록. (F08-1)
     */
    @Transactional
    fun activateExperiment(
        experimentKey: String,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ExperimentResponse {
        val experiment = findExperimentOrThrow(experimentKey)
        experiment.activate(now)
        return ExperimentResponse.from(experiment)
    }

    /**
     * ACTIVE -> STOPPED 상태 전이 및 `endedAt` 기록. (F08-1)
     *
     * 과거 수집된 `ProductEvent` 데이터는 삭제하거나 수정하지 않고 보존하며,
     * 실험 상태만 STOPPED로 전환해 신규 노출을 즉시 중단한다.
     */
    @Transactional
    fun stopExperiment(
        experimentKey: String,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ExperimentResponse {
        val experiment = findExperimentOrThrow(experimentKey)
        experiment.stop(now)
        return ExperimentResponse.from(experiment)
    }

    @Transactional
    fun updateRolloutPercentage(
        experimentKey: String,
        rolloutPercentage: Int
    ): ExperimentResponse {
        val experiment = findExperimentOrThrow(experimentKey)
        experiment.updateRolloutPercentage(rolloutPercentage)
        return ExperimentResponse.from(experiment)
    }

    @Transactional
    fun updateVariantRatio(
        experimentKey: String,
        variantARatio: Int,
        variantBRatio: Int
    ): ExperimentResponse {
        val experiment = findExperimentOrThrow(experimentKey)
        experiment.updateVariantRatio(variantARatio, variantBRatio)
        return ExperimentResponse.from(experiment)
    }

    /**
     * 비활성(`DRAFT`/`STOPPED`), 미존재 `experimentKey`, 또는 DB 조회 오류 시에도
     * 예외를 전파하지 않고 기본 경험(Control/A)을 반환하는 안전한 평가 메서드. (F01, F08)
     */
    @Transactional(readOnly = true)
    fun resolveWithFallback(experimentKey: String): ExperimentResolution {
        val trimmedKey = experimentKey.trim()
        if (trimmedKey.isEmpty()) {
            return ExperimentFallbackPolicy.fallbackForNotFound(trimmedKey)
        }

        return try {
            val experiment = experimentRepository.findByExperimentKey(trimmedKey)
            ExperimentFallbackPolicy.resolve(
                requestedKey = trimmedKey,
                experiment = experiment
            )
        } catch (ex: Exception) {
            log.warn(
                "Failed to resolve experiment '{}'. Returning safe Control(A) fallback.",
                trimmedKey,
                ex
            )
            ExperimentFallbackPolicy.fallbackForError(trimmedKey)
        }
    }

    private fun findExperimentOrThrow(experimentKey: String): Experiment {
        val trimmedKey = experimentKey.trim()
        return experimentRepository.findByExperimentKey(trimmedKey)
            ?: throw ResourceNotFoundException("존재하지 않는 실험입니다: $trimmedKey")
    }
}
