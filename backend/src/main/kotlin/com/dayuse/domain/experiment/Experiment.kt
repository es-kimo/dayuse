package com.dayuse.domain.experiment

import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

/**
 * A/B 실험 정의 및 생명주기 도메인 엔티티. (F01, F08)
 *
 * - `experimentKey`는 불변(immutable) 고유 식별자다. 실험 조건이나 문구를 의미 있게 변경할 때는
 *   기존 키를 수정해 재사용하지 않고 새 버전 키(`v1` -> `v2`)를 발급해야 과거 분석 데이터가 오염되지 않는다.
 * - 상태는 `DRAFT` -> `ACTIVE` -> `STOPPED` 단방향으로만 전이되며,
 *   활성화 시 `startedAt`, 종료 시 `endedAt` 타임스탬프를 기록한다.
 */
@Entity
@Table(
    name = "experiments",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_experiments_experiment_key",
            columnNames = ["experiment_key"]
        )
    ],
    indexes = [
        Index(
            name = "idx_experiments_status",
            columnList = "status"
        )
    ]
)
class Experiment(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(
        name = "experiment_key",
        nullable = false,
        updatable = false,
        length = MAX_KEY_LENGTH
    )
    val experimentKey: String,

    @Column(
        name = "name",
        nullable = false,
        length = MAX_NAME_LENGTH
    )
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(
        name = "status",
        nullable = false,
        length = 20
    )
    var status: ExperimentStatus = ExperimentStatus.DRAFT,

    @Column(
        name = "rollout_percentage",
        nullable = false
    )
    var rolloutPercentage: Int = DEFAULT_ROLLOUT_PERCENTAGE,

    @Column(
        name = "variant_a_ratio",
        nullable = false
    )
    var variantARatio: Int = ExperimentVariantRatio.DEFAULT_A_RATIO,

    @Column(
        name = "variant_b_ratio",
        nullable = false
    )
    var variantBRatio: Int = ExperimentVariantRatio.DEFAULT_B_RATIO,

    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    val createdAt: LocalDateTime = DateTimeUtils.nowKst(),

    @Column(name = "started_at")
    var startedAt: LocalDateTime? = null,

    @Column(name = "ended_at")
    var endedAt: LocalDateTime? = null
) {
    /** 실험에서 제공하는 기본 Variant 목록 (A: Control, B: Treatment). */
    val variants: List<ExperimentVariant>
        get() = ExperimentVariant.entries

    /** 실험 참여 대상 내 A/B 배정 비율 값 객체. */
    val variantRatio: ExperimentVariantRatio
        get() = ExperimentVariantRatio.of(variantARatio, variantBRatio)

    /** 비활성·미참여·오류 시 반환할 기본 경험(Control/Default). */
    val defaultVariant: ExperimentVariant
        get() = ExperimentVariant.DEFAULT

    fun isActive(): Boolean = status == ExperimentStatus.ACTIVE

    fun isExposable(): Boolean = status == ExperimentStatus.ACTIVE && rolloutPercentage > 0

    /**
     * DRAFT 상태의 실험을 ACTIVE로 전환하고 시작 시각(`startedAt`)을 기록한다. (F08-1)
     *
     * 이미 ACTIVE 상태이거나 STOPPED 상태인 실험은 재활성화할 수 없다.
     */
    fun activate(now: LocalDateTime = DateTimeUtils.nowKst()) {
        when (status) {
            ExperimentStatus.DRAFT -> {
                status = ExperimentStatus.ACTIVE
                startedAt = now
            }
            ExperimentStatus.ACTIVE -> {
                throw BadRequestException("이미 ACTIVE 상태인 실험입니다: $experimentKey")
            }
            ExperimentStatus.STOPPED -> {
                throw BadRequestException(
                    "이미 종료된(STOPPED) 실험은 다시 활성화할 수 없습니다. " +
                        "과거 분석 데이터 정합성을 위해 새 버전의 experimentKey를 생성하세요: $experimentKey"
                )
            }
        }
    }

    /**
     * ACTIVE 상태의 실험을 STOPPED로 전환하고 종료 시각(`endedAt`)을 기록한다. (F08-1)
     *
     * 중단 시 기존 ProductEvent 데이터는 삭제하지 않으며, 신규 Variant 노출만 즉시 중단된다.
     */
    fun stop(now: LocalDateTime = DateTimeUtils.nowKst()) {
        when (status) {
            ExperimentStatus.ACTIVE -> {
                val currentStartedAt = startedAt
                if (currentStartedAt != null && now.isBefore(currentStartedAt)) {
                    throw BadRequestException("실험 종료 시각(endedAt)은 시작 시각(startedAt) 이전일 수 없습니다.")
                }
                status = ExperimentStatus.STOPPED
                endedAt = now
            }
            ExperimentStatus.DRAFT -> {
                throw BadRequestException("아직 시작되지 않은(DRAFT) 실험은 종료(STOPPED)할 수 없습니다: $experimentKey")
            }
            ExperimentStatus.STOPPED -> {
                throw BadRequestException("이미 STOPPED 상태인 실험입니다: $experimentKey")
            }
        }
    }

    /**
     * 전체 사용자 중 실험에 포함할 Rollout 비율(0~100)을 변경한다.
     *
     * 종료된(STOPPED) 실험은 더 이상 설정을 변경할 수 없다.
     */
    fun updateRolloutPercentage(newRolloutPercentage: Int) {
        if (status == ExperimentStatus.STOPPED) {
            throw BadRequestException("종료된(STOPPED) 실험의 rolloutPercentage는 변경할 수 없습니다: $experimentKey")
        }
        validateRolloutPercentage(newRolloutPercentage)
        this.rolloutPercentage = newRolloutPercentage
    }

    /**
     * 실험 참여 대상 내 A/B 배정 비율을 변경한다.
     *
     * 이미 시작된(ACTIVE) 실험이나 종료된(STOPPED) 실험에서 A/B 비율을 바꾸면
     * 수집 기간별 표본 비율이 왜곡(Sample Ratio Mismatch)되므로 DRAFT 상태에서만 허용한다.
     */
    fun updateVariantRatio(newVariantARatio: Int, newVariantBRatio: Int) {
        if (status != ExperimentStatus.DRAFT) {
            throw BadRequestException(
                "이미 시작되었거나 종료된 실험의 Variant 배정 비율은 변경할 수 없습니다. " +
                    "조건 변경이 필요하면 새로운 버전의 experimentKey를 생성하세요: $experimentKey"
            )
        }
        ExperimentVariantRatio.validate(newVariantARatio, newVariantBRatio)
        this.variantARatio = newVariantARatio
        this.variantBRatio = newVariantBRatio
    }

    companion object {
        const val MIN_KEY_LENGTH = 3
        const val MAX_KEY_LENGTH = 64
        const val MAX_NAME_LENGTH = 120
        const val MIN_ROLLOUT_PERCENTAGE = 0
        const val MAX_ROLLOUT_PERCENTAGE = 100
        const val DEFAULT_ROLLOUT_PERCENTAGE = 100

        /** 영문 소문자로 시작하고 영문 소문자·숫자·하이픈(`-`)으로 구성된 키 형식 (예: `challenge-invite-copy-v1`). */
        private val EXPERIMENT_KEY_REGEX = Regex("^[a-z][a-z0-9-]{1,62}[a-z0-9]$")

        fun create(
            experimentKey: String,
            name: String,
            rolloutPercentage: Int = DEFAULT_ROLLOUT_PERCENTAGE,
            variantARatio: Int = ExperimentVariantRatio.DEFAULT_A_RATIO,
            variantBRatio: Int = ExperimentVariantRatio.DEFAULT_B_RATIO,
            createdAt: LocalDateTime = DateTimeUtils.nowKst()
        ): Experiment {
            val validatedKey = validateExperimentKey(experimentKey)
            val validatedName = validateName(name)
            validateRolloutPercentage(rolloutPercentage)
            ExperimentVariantRatio.validate(variantARatio, variantBRatio)

            return Experiment(
                experimentKey = validatedKey,
                name = validatedName,
                status = ExperimentStatus.DRAFT,
                rolloutPercentage = rolloutPercentage,
                variantARatio = variantARatio,
                variantBRatio = variantBRatio,
                createdAt = createdAt,
                startedAt = null,
                endedAt = null
            )
        }

        fun validateExperimentKey(rawKey: String): String {
            val trimmed = rawKey.trim()
            if (trimmed.length !in MIN_KEY_LENGTH..MAX_KEY_LENGTH) {
                throw BadRequestException(
                    "experimentKey 길이는 ${MIN_KEY_LENGTH}자 이상 ${MAX_KEY_LENGTH}자 이하여야 합니다: '$trimmed'"
                )
            }
            if (!EXPERIMENT_KEY_REGEX.matches(trimmed)) {
                throw BadRequestException(
                    "experimentKey는 영문 소문자로 시작하고 영문 소문자, 숫자, 하이픈(-)만 사용할 수 있습니다 (예: challenge-invite-copy-v1): '$trimmed'"
                )
            }
            return trimmed
        }

        fun validateName(rawName: String): String {
            val trimmed = rawName.trim()
            if (trimmed.isEmpty() || trimmed.length > MAX_NAME_LENGTH) {
                throw BadRequestException("실험 이름(name)은 1자 이상 ${MAX_NAME_LENGTH}자 이하여야 합니다.")
            }
            return trimmed
        }

        fun validateRolloutPercentage(rolloutPercentage: Int) {
            if (rolloutPercentage !in MIN_ROLLOUT_PERCENTAGE..MAX_ROLLOUT_PERCENTAGE) {
                throw BadRequestException(
                    "rolloutPercentage는 $MIN_ROLLOUT_PERCENTAGE 이상 $MAX_ROLLOUT_PERCENTAGE 이하여야 합니다. (입력값: $rolloutPercentage)"
                )
            }
        }
    }
}
