@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.experiment

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import java.time.LocalDateTime

class ExperimentTest {

    private val baseTime = LocalDateTime.of(2026, 9, 30, 12, 0, 0)

    @Test
    @DisplayName("실험 생성 시 기본 상태는 DRAFT이고 startedAt, endedAt은 null이며 기본 Variant는 A/B(50:50)로 설정된다")
    fun createExperimentWithDefaults() {
        val experiment = Experiment.create(
            experimentKey = "challenge-invite-copy-v1",
            name = "챌린지 초대 문구 실험 v1",
            createdAt = baseTime
        )

        assertEquals("challenge-invite-copy-v1", experiment.experimentKey)
        assertEquals("챌린지 초대 문구 실험 v1", experiment.name)
        assertEquals(ExperimentStatus.DRAFT, experiment.status)
        assertEquals(100, experiment.rolloutPercentage)
        assertEquals(listOf(ExperimentVariant.A, ExperimentVariant.B), experiment.variants)
        assertEquals(50, experiment.variantRatio.a)
        assertEquals(50, experiment.variantRatio.b)
        assertEquals(ExperimentVariant.A, experiment.defaultVariant)
        assertEquals(baseTime, experiment.createdAt)
        assertNull(experiment.startedAt)
        assertNull(experiment.endedAt)
        assertFalse(experiment.isActive())
        assertFalse(experiment.isExposable())
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "",
            "  ",
            "ab",
            "Challenge-Invite-V1",
            "challenge_invite_v1",
            "-challenge-v1",
            "challenge-v1-",
            "123-challenge-v1",
            "challenge invite v1"
        ]
    )
    @DisplayName("유효하지 않은 형식의 experimentKey는 생성 시 거부한다")
    fun rejectInvalidExperimentKey(invalidKey: String) {
        assertThrows(BadRequestException::class.java) {
            Experiment.create(
                experimentKey = invalidKey,
                name = "잘못된 키 실험"
            )
        }
    }

    @ParameterizedTest
    @ValueSource(ints = [-1, -100, 101, 150])
    @DisplayName("rolloutPercentage가 0~100 범위를 벗어나면 예외가 발생한다")
    fun rejectOutOfRangeRolloutPercentage(invalidRollout: Int) {
        assertThrows(BadRequestException::class.java) {
            Experiment.create(
                experimentKey = "rollout-range-test-v1",
                name = "롤아웃 범위 검증",
                rolloutPercentage = invalidRollout
            )
        }
    }

    @Test
    @DisplayName("rolloutPercentage 경계값 0과 100은 정상 허용한다")
    fun allowBoundaryRolloutPercentage() {
        val zeroRollout = Experiment.create(
            experimentKey = "rollout-zero-v1",
            name = "롤아웃 0%",
            rolloutPercentage = 0
        )
        val fullRollout = Experiment.create(
            experimentKey = "rollout-full-v1",
            name = "롤아웃 100%",
            rolloutPercentage = 100
        )

        assertEquals(0, zeroRollout.rolloutPercentage)
        assertEquals(100, fullRollout.rolloutPercentage)
    }

    @Test
    @DisplayName("Variant A/B 비율의 합이 100이 아니거나 음수이면 예외가 발생한다")
    fun validateVariantRatioSumAndBounds() {
        assertThrows(BadRequestException::class.java) {
            Experiment.create(
                experimentKey = "ratio-invalid-sum-v1",
                name = "비율 합계 오류",
                variantARatio = 60,
                variantBRatio = 50
            )
        }

        assertThrows(BadRequestException::class.java) {
            Experiment.create(
                experimentKey = "ratio-negative-v1",
                name = "음수 비율 오류",
                variantARatio = -10,
                variantBRatio = 110
            )
        }
    }

    @Test
    @DisplayName("DRAFT -> ACTIVE -> STOPPED 상태 전이 시 startedAt과 endedAt 타임스탬프가 정확히 기록된다")
    fun transitionFromDraftToActiveToStopped() {
        val experiment = Experiment.create(
            experimentKey = "lifecycle-test-v1",
            name = "생명주기 상태 전이 테스트",
            rolloutPercentage = 50,
            createdAt = baseTime
        )

        val activatedAt = baseTime.plusHours(1)
        experiment.activate(activatedAt)

        assertEquals(ExperimentStatus.ACTIVE, experiment.status)
        assertEquals(activatedAt, experiment.startedAt)
        assertNull(experiment.endedAt)
        assertTrue(experiment.isActive())
        assertTrue(experiment.isExposable())

        val stoppedAt = activatedAt.plusDays(7)
        experiment.stop(stoppedAt)

        assertEquals(ExperimentStatus.STOPPED, experiment.status)
        assertEquals(activatedAt, experiment.startedAt)
        assertEquals(stoppedAt, experiment.endedAt)
        assertFalse(experiment.isActive())
        assertFalse(experiment.isExposable())
    }

    @Test
    @DisplayName("역방향 상태 전이(STOPPED -> ACTIVE, DRAFT -> STOPPED) 및 중복 전이는 차단된다")
    fun rejectInvalidStateTransitions() {
        val experiment = Experiment.create(
            experimentKey = "invalid-transition-v1",
            name = "비정상 상태 전이 차단",
            createdAt = baseTime
        )

        // DRAFT 상태에서 바로 stop 불가
        assertThrows(BadRequestException::class.java) {
            experiment.stop(baseTime.plusHours(1))
        }

        val startedAt = baseTime.plusHours(2)
        experiment.activate(startedAt)

        // 이미 ACTIVE인 실험을 중복 activate 불가
        assertThrows(BadRequestException::class.java) {
            experiment.activate(startedAt.plusMinutes(10))
        }

        // startedAt 이전 시각으로 stop 불가
        assertThrows(BadRequestException::class.java) {
            experiment.stop(startedAt.minusMinutes(1))
        }

        val endedAt = startedAt.plusDays(3)
        experiment.stop(endedAt)

        // 이미 STOPPED인 실험을 다시 activate하거나 중복 stop 불가
        assertThrows(BadRequestException::class.java) {
            experiment.activate(endedAt.plusHours(1))
        }
        assertThrows(BadRequestException::class.java) {
            experiment.stop(endedAt.plusHours(1))
        }
    }

    @Test
    @DisplayName("실험 시작(ACTIVE) 이후에는 표본 비율 왜곡 방지를 위해 Variant 배정 비율을 변경할 수 없다")
    fun preventVariantRatioChangeAfterActivation() {
        val experiment = Experiment.create(
            experimentKey = "immutable-ratio-v1",
            name = "배정 비율 변경 제한 검증",
            createdAt = baseTime
        )

        // DRAFT 상태에서는 비율 조정 가능
        experiment.updateVariantRatio(newVariantARatio = 70, newVariantBRatio = 30)
        assertEquals(70, experiment.variantRatio.a)
        assertEquals(30, experiment.variantRatio.b)

        // ACTIVE 전환 후에는 Variant 비율 변경 불가 (새 버전 키 발급 필요)
        experiment.activate(baseTime.plusHours(1))
        assertThrows(BadRequestException::class.java) {
            experiment.updateVariantRatio(newVariantARatio = 50, newVariantBRatio = 50)
        }

        // ACTIVE 상태에서 점진적 Rollout 비율 변경은 가능
        experiment.updateRolloutPercentage(80)
        assertEquals(80, experiment.rolloutPercentage)

        // STOPPED 전환 후에는 Rollout 비율도 변경 불가
        experiment.stop(baseTime.plusDays(1))
        assertThrows(BadRequestException::class.java) {
            experiment.updateRolloutPercentage(100)
        }
    }
}
