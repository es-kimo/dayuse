package com.dayuse.domain.experiment

/**
 * 기본 경험(Control/Default) Fallback이 적용된 사유. (F01, F08)
 */
enum class ExperimentFallbackReason {
    /** 정상 활성(ACTIVE) 상태이며 노출 가능한 실험. */
    NONE,

    /** 요청한 `experimentKey`에 해당하는 실험이 존재하지 않거나 키가 비어 있음. */
    NOT_FOUND,

    /** 실험이 아직 `DRAFT`(노출 전 개발/검증) 상태임. */
    INACTIVE_DRAFT,

    /** 실험이 `STOPPED`(종료/중단) 상태임. */
    INACTIVE_STOPPED,

    /** 실험이 `ACTIVE` 상태이지만 `rolloutPercentage`가 0%로 설정되어 신규 노출이 비활성화됨. */
    ROLLOUT_DISABLED,

    /** 실험 조회/평가 중 예기치 않은 오류가 발생하여 안전하게 기본 경험으로 보호함. */
    ERROR
}

/**
 * 실험 조회 및 활성 여부에 따른 기본 정책 판정 결과. (F01, F08)
 *
 * `DRAFT`, `STOPPED`, 미존재 `experimentKey`, 또는 시스템 오류 시에도
 * 예외를 던져 핵심 비즈니스 기능을 중단시키지 않고 항상 `variant = A`(Control/Default)와
 * `participating = false`를 반환한다.
 */
data class ExperimentResolution(
    val experimentKey: String,
    val status: ExperimentStatus?,
    val variant: ExperimentVariant = ExperimentVariant.DEFAULT,
    val participating: Boolean,
    val rolloutPercentage: Int,
    val variantRatio: ExperimentVariantRatio = ExperimentVariantRatio.DEFAULT,
    val isFallback: Boolean,
    val fallbackReason: ExperimentFallbackReason
)

/**
 * 비활성·미존재·오류 상황에 대한 안전한 Default Fallback 정책. (F01, F08)
 */
object ExperimentFallbackPolicy {

    /**
     * 조회된 [Experiment] 엔티티(또는 null)를 바탕으로 노출 가능 여부와 Fallback 결과를 판정한다.
     */
    fun resolve(
        requestedKey: String,
        experiment: Experiment?
    ): ExperimentResolution {
        val normalizedKey = requestedKey.trim()
        if (normalizedKey.isEmpty() || experiment == null) {
            return fallbackForNotFound(normalizedKey)
        }

        return when (experiment.status) {
            ExperimentStatus.DRAFT -> ExperimentResolution(
                experimentKey = experiment.experimentKey,
                status = ExperimentStatus.DRAFT,
                variant = ExperimentVariant.DEFAULT,
                participating = false,
                rolloutPercentage = experiment.rolloutPercentage,
                variantRatio = experiment.variantRatio,
                isFallback = true,
                fallbackReason = ExperimentFallbackReason.INACTIVE_DRAFT
            )

            ExperimentStatus.STOPPED -> ExperimentResolution(
                experimentKey = experiment.experimentKey,
                status = ExperimentStatus.STOPPED,
                variant = ExperimentVariant.DEFAULT,
                participating = false,
                rolloutPercentage = experiment.rolloutPercentage,
                variantRatio = experiment.variantRatio,
                isFallback = true,
                fallbackReason = ExperimentFallbackReason.INACTIVE_STOPPED
            )

            ExperimentStatus.ACTIVE -> {
                if (experiment.rolloutPercentage <= 0) {
                    ExperimentResolution(
                        experimentKey = experiment.experimentKey,
                        status = ExperimentStatus.ACTIVE,
                        variant = ExperimentVariant.DEFAULT,
                        participating = false,
                        rolloutPercentage = 0,
                        variantRatio = experiment.variantRatio,
                        isFallback = true,
                        fallbackReason = ExperimentFallbackReason.ROLLOUT_DISABLED
                    )
                } else {
                    ExperimentResolution(
                        experimentKey = experiment.experimentKey,
                        status = ExperimentStatus.ACTIVE,
                        variant = ExperimentVariant.DEFAULT,
                        participating = true,
                        rolloutPercentage = experiment.rolloutPercentage,
                        variantRatio = experiment.variantRatio,
                        isFallback = false,
                        fallbackReason = ExperimentFallbackReason.NONE
                    )
                }
            }
        }
    }

    fun fallbackForNotFound(experimentKey: String): ExperimentResolution {
        return ExperimentResolution(
            experimentKey = experimentKey.trim(),
            status = null,
            variant = ExperimentVariant.DEFAULT,
            participating = false,
            rolloutPercentage = 0,
            variantRatio = ExperimentVariantRatio.DEFAULT,
            isFallback = true,
            fallbackReason = ExperimentFallbackReason.NOT_FOUND
        )
    }

    fun fallbackForError(experimentKey: String): ExperimentResolution {
        return ExperimentResolution(
            experimentKey = experimentKey.trim(),
            status = null,
            variant = ExperimentVariant.DEFAULT,
            participating = false,
            rolloutPercentage = 0,
            variantRatio = ExperimentVariantRatio.DEFAULT,
            isFallback = true,
            fallbackReason = ExperimentFallbackReason.ERROR
        )
    }
}
