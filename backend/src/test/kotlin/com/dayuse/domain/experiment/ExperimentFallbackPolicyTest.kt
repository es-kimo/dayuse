@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.experiment

import com.dayuse.domain.experiment.service.ExperimentService
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.time.LocalDateTime

class ExperimentFallbackPolicyTest {

    private val baseTime = LocalDateTime.of(2026, 9, 30, 12, 0, 0)

    @Test
    @DisplayName("존재하지 않는 experimentKey 조회 시 예외를 던지지 않고 Control(A) Fallback을 반환한다")
    fun fallbackWhenExperimentNotFound() {
        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = "non-existent-exp-v1",
            experiment = null
        )

        assertEquals("non-existent-exp-v1", resolution.experimentKey)
        assertNull(resolution.status)
        assertEquals(ExperimentVariant.A, resolution.variant)
        assertFalse(resolution.participating)
        assertTrue(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.NOT_FOUND, resolution.fallbackReason)
    }

    @Test
    @DisplayName("DRAFT 상태의 실험 조회 시 노출하지 않고 Control(A) Fallback을 반환한다")
    fun fallbackWhenExperimentIsDraft() {
        val draftExperiment = Experiment.create(
            experimentKey = "draft-exp-v1",
            name = "준비 중인 실험",
            rolloutPercentage = 100,
            createdAt = baseTime
        )

        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = "draft-exp-v1",
            experiment = draftExperiment
        )

        assertEquals("draft-exp-v1", resolution.experimentKey)
        assertEquals(ExperimentStatus.DRAFT, resolution.status)
        assertEquals(ExperimentVariant.A, resolution.variant)
        assertFalse(resolution.participating)
        assertTrue(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.INACTIVE_DRAFT, resolution.fallbackReason)
    }

    @Test
    @DisplayName("STOPPED 상태의 실험 조회 시 신규 노출을 중단하고 Control(A) Fallback을 반환한다")
    fun fallbackWhenExperimentIsStopped() {
        val experiment = Experiment.create(
            experimentKey = "stopped-exp-v1",
            name = "종료된 실험",
            rolloutPercentage = 100,
            createdAt = baseTime
        )
        experiment.activate(baseTime.plusHours(1))
        experiment.stop(baseTime.plusDays(2))

        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = "stopped-exp-v1",
            experiment = experiment
        )

        assertEquals("stopped-exp-v1", resolution.experimentKey)
        assertEquals(ExperimentStatus.STOPPED, resolution.status)
        assertEquals(ExperimentVariant.A, resolution.variant)
        assertFalse(resolution.participating)
        assertTrue(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.INACTIVE_STOPPED, resolution.fallbackReason)
    }

    @Test
    @DisplayName("ACTIVE 상태여도 rolloutPercentage가 0이면 Control(A) Fallback을 반환한다")
    fun fallbackWhenRolloutPercentageIsZero() {
        val experiment = Experiment.create(
            experimentKey = "zero-rollout-exp-v1",
            name = "0% 롤아웃 활성 실험",
            rolloutPercentage = 0,
            createdAt = baseTime
        )
        experiment.activate(baseTime.plusHours(1))

        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = "zero-rollout-exp-v1",
            experiment = experiment
        )

        assertEquals(ExperimentStatus.ACTIVE, resolution.status)
        assertEquals(ExperimentVariant.A, resolution.variant)
        assertFalse(resolution.participating)
        assertTrue(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.ROLLOUT_DISABLED, resolution.fallbackReason)
    }

    @Test
    @DisplayName("ACTIVE 상태이고 rolloutPercentage가 양수이면 정상 실험 참여 가능 상태로 판정한다")
    fun activeExperimentResolvesWithoutFallback() {
        val experiment = Experiment.create(
            experimentKey = "active-exp-v1",
            name = "정상 활성 실험",
            rolloutPercentage = 50,
            variantARatio = 40,
            variantBRatio = 60,
            createdAt = baseTime
        )
        experiment.activate(baseTime.plusHours(1))

        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = "active-exp-v1",
            experiment = experiment
        )

        assertEquals("active-exp-v1", resolution.experimentKey)
        assertEquals(ExperimentStatus.ACTIVE, resolution.status)
        assertTrue(resolution.participating)
        assertFalse(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.NONE, resolution.fallbackReason)
        assertEquals(50, resolution.rolloutPercentage)
        assertEquals(40, resolution.variantRatio.a)
        assertEquals(60, resolution.variantRatio.b)
    }

    @Test
    @DisplayName("저장소 장애 등 예기치 않은 예외 발생 시에도 서비스가 중단되지 않고 ERROR 사유의 Control(A) Fallback을 반환한다")
    fun fallbackGracefullyWhenRepositoryThrowsException() {
        val failingRepository = mock(ExperimentRepository::class.java)
        `when`(failingRepository.findByExperimentKey("db-error-exp-v1"))
            .thenThrow(RuntimeException("Simulated DB connection failure"))

        val service = ExperimentService(failingRepository)
        val resolution = service.resolveWithFallback("db-error-exp-v1")

        assertEquals("db-error-exp-v1", resolution.experimentKey)
        assertNull(resolution.status)
        assertEquals(ExperimentVariant.A, resolution.variant)
        assertFalse(resolution.participating)
        assertTrue(resolution.isFallback)
        assertEquals(ExperimentFallbackReason.ERROR, resolution.fallbackReason)
    }
}
