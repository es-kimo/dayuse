package com.dayuse.domain.experiment

import java.nio.charset.StandardCharsets
import java.security.MessageDigest

/**
 * 특정 사용자에 대한 Experiment 배정 결과. (F02, F03)
 *
 * - `participating == false`인 경우(미참여 버킷, 비활성 실험, 미존재 키, 오류 Fallback)에는
 *   언제나 기본 경험(`variant = A`)을 반환한다.
 * - `participating == true`인 경우에만 실험 참여 대상자로서 `A` 또는 `B` Variant가 배정된다.
 */
data class ExperimentAssignment(
    val experimentKey: String,
    val userId: Long,
    val status: ExperimentStatus?,
    val participating: Boolean,
    val variant: ExperimentVariant,
    val rolloutPercentage: Int,
    val rolloutBucket: Int?,
    val variantBucket: Int?,
    val isFallback: Boolean,
    val fallbackReason: ExperimentFallbackReason
)

/**
 * `experimentKey + userId` 기반 결정론적 해시(Deterministic Hashing) 및 Rollout/Variant 배정 엔진. (F02, F03)
 *
 * ### 설계 원칙
 * 1. **Stateless 일관성**: DB에 배정 레코드를 매번 INSERT하거나 `Random()`을 호출하지 않고,
 *    SHA-256 해시로 `0 ~ 99` 버킷을 계산하여 다중 서버·재로그인·새로고침 환경에서도 100% 동일한 결과를 보장한다.
 * 2. **실험 간 독립성(Carryover 방지)**: 해시 시드에 `experimentKey`와 `userId`를 함께 결합하여,
 *    서로 다른 실험(`exp-1`, `exp-2`)에서 특정 사용자 집단이 항상 같은 Variant로 몰리지 않도록 독립 분포를 보장한다.
 * 3. **Rollout 버킷과 Variant 버킷의 Salt 분리(`:rollout` vs `:variant`)**:
 *    하나의 버킷 값으로 Rollout 포함 여부와 A/B Variant를 동시에 판정하면
 *    예컨대 `rolloutPercentage = 50%`, `A:B = 50:50`일 때 참여자(`bucket 0..49`) 전원이 `A`로만 배정되는 수학적 편향이 발생한다.
 *    이를 막기 위해 Rollout 판정 시드(`:rollout`)와 Variant 배정 시드(`:variant`)를 분리한다.
 */
object ExperimentAssigner {

    const val BUCKET_MODULO = 100
    const val ROLLOUT_SALT = "rollout"
    const val VARIANT_SALT = "variant"

    /**
     * `(experimentKey, userId, salt)` 조합을 SHA-256으로 해싱하여 `0 ~ 99` 정수 버킷으로 변환한다.
     */
    fun computeBucket(
        experimentKey: String,
        userId: Long,
        salt: String = ROLLOUT_SALT
    ): Int {
        val normalizedKey = experimentKey.trim()
        val seed = "$normalizedKey:$userId:$salt"
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(seed.toByteArray(StandardCharsets.UTF_8))

        // 상위 4바이트를 부호 없는 32비트 정수(0 ~ 4,294,967,295)로 읽어 0 ~ 99 버킷을 산출한다.
        val unsignedInt = ((digest[0].toLong() and 0xFF) shl 24) or
            ((digest[1].toLong() and 0xFF) shl 16) or
            ((digest[2].toLong() and 0xFF) shl 8) or
            (digest[3].toLong() and 0xFF)

        return (unsignedInt % BUCKET_MODULO).toInt()
    }

    fun calculateRolloutBucket(experimentKey: String, userId: Long): Int {
        return computeBucket(
            experimentKey = experimentKey,
            userId = userId,
            salt = ROLLOUT_SALT
        )
    }

    fun calculateVariantBucket(experimentKey: String, userId: Long): Int {
        return computeBucket(
            experimentKey = experimentKey,
            userId = userId,
            salt = VARIANT_SALT
        )
    }

    /**
     * 실험 설정과 `userId`를 바탕으로 참여 여부(`participating`)와 Variant(`A`/`B`)를 결정한다.
     */
    fun assign(
        requestedKey: String,
        userId: Long,
        experiment: Experiment?
    ): ExperimentAssignment {
        val normalizedKey = requestedKey.trim()
        val resolution = ExperimentFallbackPolicy.resolve(
            requestedKey = normalizedKey,
            experiment = experiment
        )

        // 비활성(DRAFT/STOPPED), 미존재, 0% 롤아웃 등 Fallback 대상이면 즉시 Control(A) 반환
        if (resolution.isFallback || experiment == null) {
            return ExperimentAssignment(
                experimentKey = resolution.experimentKey,
                userId = userId,
                status = resolution.status,
                participating = false,
                variant = ExperimentVariant.DEFAULT,
                rolloutPercentage = resolution.rolloutPercentage,
                rolloutBucket = null,
                variantBucket = null,
                isFallback = true,
                fallbackReason = resolution.fallbackReason
            )
        }

        if (userId <= 0L) {
            return fallbackForError(experiment.experimentKey, userId)
        }

        val rolloutBucket = calculateRolloutBucket(experiment.experimentKey, userId)
        if (rolloutBucket >= experiment.rolloutPercentage) {
            // Rollout 비율 밖의 사용자는 실험 미참여(Control/Default 경험 제공)
            return ExperimentAssignment(
                experimentKey = experiment.experimentKey,
                userId = userId,
                status = experiment.status,
                participating = false,
                variant = ExperimentVariant.DEFAULT,
                rolloutPercentage = experiment.rolloutPercentage,
                rolloutBucket = rolloutBucket,
                variantBucket = null,
                isFallback = false,
                fallbackReason = ExperimentFallbackReason.NONE
            )
        }

        val variantBucket = calculateVariantBucket(experiment.experimentKey, userId)
        val assignedVariant = if (variantBucket < experiment.variantRatio.a) {
            ExperimentVariant.A
        } else {
            ExperimentVariant.B
        }

        return ExperimentAssignment(
            experimentKey = experiment.experimentKey,
            userId = userId,
            status = experiment.status,
            participating = true,
            variant = assignedVariant,
            rolloutPercentage = experiment.rolloutPercentage,
            rolloutBucket = rolloutBucket,
            variantBucket = variantBucket,
            isFallback = false,
            fallbackReason = ExperimentFallbackReason.NONE
        )
    }

    fun fallbackForError(
        experimentKey: String,
        userId: Long
    ): ExperimentAssignment {
        return ExperimentAssignment(
            experimentKey = experimentKey.trim(),
            userId = userId,
            status = null,
            participating = false,
            variant = ExperimentVariant.DEFAULT,
            rolloutPercentage = 0,
            rolloutBucket = null,
            variantBucket = null,
            isFallback = true,
            fallbackReason = ExperimentFallbackReason.ERROR
        )
    }
}
