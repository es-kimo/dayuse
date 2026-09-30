package com.dayuse.domain.experiment

import com.dayuse.global.exception.BadRequestException

/**
 * A/B 실험의 Variant 정의. (F01)
 *
 * - [A]: 기본 경험(Control / Default). 비활성 실험·미존재 키·미참여·오류 Fallback 시 항상 [A]가 반환된다.
 * - [B]: 변경된 실험 경험(Treatment).
 */
enum class ExperimentVariant {
    A,
    B;

    val isControl: Boolean
        get() = this == A

    companion object {
        val DEFAULT: ExperimentVariant = A
        val CONTROL: ExperimentVariant = A
        val TREATMENT: ExperimentVariant = B

        fun from(raw: String): ExperimentVariant {
            val normalized = raw.trim().uppercase()
            return entries.firstOrNull { it.name == normalized }
                ?: throw BadRequestException("허용되지 않는 Variant입니다: $raw (허용값: A, B)")
        }
    }
}

/**
 * 실험 참여 대상 내부의 A/B 배정 비율(합계 100%). (F01)
 */
data class ExperimentVariantRatio(
    val a: Int = DEFAULT_A_RATIO,
    val b: Int = DEFAULT_B_RATIO
) {
    init {
        validate(a, b)
    }

    fun ratioOf(variant: ExperimentVariant): Int = when (variant) {
        ExperimentVariant.A -> a
        ExperimentVariant.B -> b
    }

    operator fun get(variant: ExperimentVariant): Int = ratioOf(variant)

    operator fun get(variantName: String): Int = ratioOf(ExperimentVariant.from(variantName))

    fun toMap(): Map<String, Int> = mapOf(
        ExperimentVariant.A.name to a,
        ExperimentVariant.B.name to b
    )

    companion object {
        const val DEFAULT_A_RATIO = 50
        const val DEFAULT_B_RATIO = 50

        val DEFAULT = ExperimentVariantRatio(DEFAULT_A_RATIO, DEFAULT_B_RATIO)

        fun of(a: Int, b: Int): ExperimentVariantRatio = ExperimentVariantRatio(a = a, b = b)

        fun validate(a: Int, b: Int) {
            if (a !in 0..100 || b !in 0..100) {
                throw BadRequestException(" 각 Variant 비율(A, B)은 0에서 100 사이여야 합니다. (입력값: A=$a, B=$b)")
            }
            if (a + b != 100) {
                throw BadRequestException("Variant A와 B의 비율 합계는 정확히 100이어야 합니다. (입력값: A=$a, B=$b, 합계=${a + b})")
            }
        }
    }
}
