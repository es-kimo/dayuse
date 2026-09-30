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

class ExperimentAssignerTest {

    private val baseTime = LocalDateTime.of(2026, 10, 1, 9, 0, 0)

    private fun activeExperiment(
        key: String = "challenge-invite-copy-v1",
        rolloutPercentage: Int = 100,
        variantARatio: Int = 50,
        variantBRatio: Int = 50
    ): Experiment {
        return Experiment.create(
            experimentKey = key,
            name = "테스트 실험 ($key)",
            rolloutPercentage = rolloutPercentage,
            variantARatio = variantARatio,
            variantBRatio = variantBRatio,
            createdAt = baseTime
        ).also { it.activate(baseTime.plusMinutes(5)) }
    }

    @Test
    @DisplayName("동일한 experimentKey와 userId 조합은 반복 호출해도 항상 100% 동일한 버킷과 Variant를 반환한다")
    fun deterministicRepeatabilityForSameUserAndExperiment() {
        val experiment = activeExperiment(
            key = "challenge-invite-copy-v1",
            rolloutPercentage = 50,
            variantARatio = 50,
            variantBRatio = 50
        )

        for (userId in 1L..50L) {
            val first = ExperimentAssigner.assign(experiment.experimentKey, userId, experiment)
            repeat(20) {
                val next = ExperimentAssigner.assign(experiment.experimentKey, userId, experiment)
                assertEquals(first, next)
            }
        }
    }

    @Test
    @DisplayName("모든 해시 버킷(rolloutBucket, variantBucket)은 항상 0 이상 99 이하 범위 내에 위치한다")
    fun bucketsAlwaysWithinZeroToNinetyNine() {
        for (userId in 1L..5_000L) {
            val rolloutBucket = ExperimentAssigner.calculateRolloutBucket("challenge-invite-copy-v1", userId)
            val variantBucket = ExperimentAssigner.calculateVariantBucket("challenge-invite-copy-v1", userId)
            assertTrue(rolloutBucket in 0..99, "rolloutBucket out of bounds: $rolloutBucket")
            assertTrue(variantBucket in 0..99, "variantBucket out of bounds: $variantBucket")
        }
    }

    @Test
    @DisplayName("Rollout 시드와 Variant 시드를 분리하여 50% Rollout 시에도 참여자 내 A/B 비율이 50:50으로 왜곡 없이 배정된다")
    fun rolloutAndVariantSaltSeparationPreventsBias() {
        val experiment = activeExperiment(
            key = "rollout-50-ab-50-v1",
            rolloutPercentage = 50,
            variantARatio = 50,
            variantBRatio = 50
        )

        val totalUsers = 10_000
        val assignments = (1L..totalUsers.toLong()).map { userId ->
            ExperimentAssigner.assign(experiment.experimentKey, userId, experiment)
        }

        val participants = assignments.filter { it.participating }
        val nonParticipants = assignments.filter { !it.participating }

        // 미참여자는 전원 기본 경험(A)을 받아야 한다
        assertTrue(nonParticipants.all { it.variant == ExperimentVariant.A && it.variantBucket == null })

        // 전체 참여율 약 50% (47% ~ 53% 허용 오차)
        val participationRate = participants.size.toDouble() / totalUsers
        assertTrue(
            participationRate in 0.47..0.53,
            "참여율이 기대 범위(50%)를 벗어났습니다: $participationRate"
        )

        // 참여자 내부 A / B 비율이 각각 약 50%여야 한다 (단일 버킷 재사용 시 A=100%, B=0%가 되는 함정 검증)
        val variantACount = participants.count { it.variant == ExperimentVariant.A }
        val variantBCount = participants.count { it.variant == ExperimentVariant.B }
        val variantBRateAmongParticipants = variantBCount.toDouble() / participants.size

        assertTrue(variantACount > 0 && variantBCount > 0)
        assertTrue(
            variantBRateAmongParticipants in 0.46..0.54,
            "참여자 내 Variant B 비율이 기대 범위(50%)를 벗어났습니다: $variantBRateAmongParticipants"
        )
    }

    @Test
    @DisplayName("비대칭 Variant 비율(A 30% : B 70%) 설정 시 지정한 비율에 맞게 분포된다")
    fun respectsCustomVariantRatioDistribution() {
        val experiment = activeExperiment(
            key = "custom-ratio-30-70-v1",
            rolloutPercentage = 100,
            variantARatio = 30,
            variantBRatio = 70
        )

        val totalUsers = 10_000
        val assignments = (1L..totalUsers.toLong()).map { userId ->
            ExperimentAssigner.assign(experiment.experimentKey, userId, experiment)
        }

        assertEquals(totalUsers, assignments.count { it.participating })
        val variantARate = assignments.count { it.variant == ExperimentVariant.A }.toDouble() / totalUsers
        val variantBRate = assignments.count { it.variant == ExperimentVariant.B }.toDouble() / totalUsers

        assertTrue(variantARate in 0.27..0.33, "Variant A 비율이 기대 범위(30%)를 벗어났습니다: $variantARate")
        assertTrue(variantBRate in 0.67..0.73, "Variant B 비율이 기대 범위(70%)를 벗어났습니다: $variantBRate")
    }

    @Test
    @DisplayName("서로 다른 experimentKey 간에는 동일 사용자 집단의 배정 결과가 독립적으로 분포된다 (Carryover 방지)")
    fun independentDistributionAcrossDifferentExperiments() {
        val exp1 = activeExperiment(key = "challenge-invite-copy-v1", rolloutPercentage = 100)
        val exp2 = activeExperiment(key = "onboarding-cta-copy-v1", rolloutPercentage = 100)

        val totalUsers = 10_000
        var bothA = 0
        var aThenB = 0
        var bThenA = 0
        var bothB = 0

        for (userId in 1L..totalUsers.toLong()) {
            val v1 = ExperimentAssigner.assign(exp1.experimentKey, userId, exp1).variant
            val v2 = ExperimentAssigner.assign(exp2.experimentKey, userId, exp2).variant
            when {
                v1 == ExperimentVariant.A && v2 == ExperimentVariant.A -> bothA++
                v1 == ExperimentVariant.A && v2 == ExperimentVariant.B -> aThenB++
                v1 == ExperimentVariant.B && v2 == ExperimentVariant.A -> bThenA++
                v1 == ExperimentVariant.B && v2 == ExperimentVariant.B -> bothB++
            }
        }

        // 두 독립 50:50 실험의 교차 조합 (A,A), (A,B), (B,A), (B,B)는 각각 약 25%씩 분포해야 한다
        for ((label, count) in listOf("AA" to bothA, "AB" to aThenB, "BA" to bThenA, "BB" to bothB)) {
            val ratio = count.toDouble() / totalUsers
            assertTrue(
                ratio in 0.22..0.28,
                "실험 간 교차 분포($label)가 독립 기대치(25%)를 벗어났습니다: $ratio"
            )
        }
    }

    @Test
    @DisplayName("비활성(DRAFT/STOPPED), 미존재 실험, 또는 저장소 예외 시 항상 미참여(participating=false)와 Control(A)을 반환한다")
    fun fallbackToControlWhenInactiveOrError() {
        val draftExp = Experiment.create(
            experimentKey = "draft-assign-v1",
            name = "초안 실험",
            createdAt = baseTime
        )
        val draftResult = ExperimentAssigner.assign("draft-assign-v1", 10L, draftExp)
        assertFalse(draftResult.participating)
        assertEquals(ExperimentVariant.A, draftResult.variant)
        assertTrue(draftResult.isFallback)
        assertEquals(ExperimentFallbackReason.INACTIVE_DRAFT, draftResult.fallbackReason)
        assertNull(draftResult.rolloutBucket)
        assertNull(draftResult.variantBucket)

        val failingRepo = mock(ExperimentRepository::class.java)
        `when`(failingRepo.findByExperimentKey("broken-exp-v1"))
            .thenThrow(RuntimeException("DB timeout"))

        val service = ExperimentService(failingRepo)
        val errorResult = service.assignVariant("broken-exp-v1", 10L)
        assertFalse(errorResult.participating)
        assertEquals(ExperimentVariant.A, errorResult.variant)
        assertTrue(errorResult.isFallback)
        assertEquals(ExperimentFallbackReason.ERROR, errorResult.fallbackReason)
    }
}
