package com.dayuse.domain.experiment

import com.dayuse.domain.analytics.ExperimentEventContext
import com.dayuse.domain.analytics.ProductEvent
import com.dayuse.domain.analytics.ProductEventName
import com.dayuse.global.exception.BadRequestException
import java.time.LocalDateTime

/**
 * 단일 Variant(A 또는 B)의 노출·전환·CVR 집계 결과. (v0.10 F07)
 */
data class VariantConversionMetrics(
    val variant: ExperimentVariant,
    /** 해당 Variant에 실제 노출(`experiment_exposed`)된 고유 사용자 수. */
    val exposedUsers: Long,
    /** Raw 노출 이벤트 수 (새로고침·재방문 등 포함). */
    val exposureEvents: Long,
    /** 노출된 사용자 중 노출 시점 이후 목표 Conversion Event에 도달한 고유 사용자 수. */
    val convertedUsers: Long,
    /** 노출 이후 발생한 Raw 전환 이벤트 수 (동일 사용자의 반복 전환 포함). */
    val conversionEvents: Long,
    /** 고유 사용자 기준 전환율(%): `(convertedUsers / exposedUsers) * 100` (소수점 둘째 자리 반올림). */
    val cvr: Double
)

/**
 * 특정 Experiment의 Variant별 성과 비교 리포트 계산 결과. (v0.10 F07)
 */
data class ExperimentConversionSummary(
    val experimentKey: String,
    val conversionEventName: String,
    val totalExposedUsers: Long,
    val totalConvertedUsers: Long,
    val overallCvr: Double,
    val variants: List<VariantConversionMetrics>
)

/**
 * Experiment Variant별 Exposure · Conversion · CVR 산출기. (v0.10 F06, F07)
 *
 * ### 핵심 집계 불변식
 * 1. **고유 사용자(Unique Users) 기준 CVR**:
 *    한 사용자가 화면을 10번 새로고침해 `experiment_exposed`가 10번 쌓이고
 *    전환 행동(`challenge_joined`)을 3번 발생시켜도 `exposedUsers = 1`, `convertedUsers = 1`, `cvr = 100.0%`로 계산한다.
 * 2. **비노출 사용자 오염 차단**:
 *    `experiment_exposed` 기록이 없는 사용자가 발생시킨 전환 이벤트나,
 *    최초 노출 시각(`firstExposedAt`) 이전에 발생한 전환 이벤트는 실험 성과(`convertedUsers`, `conversionEvents`)에서 제외한다.
 * 3. **Variant 정합성 검증**:
 *    전환 이벤트의 `properties`에 명시적 Experiment Context(`experimentKey`, `variant`)가 들어 있는 경우,
 *    해당 `experimentKey` 및 노출된 `variant`와 일치하는 이벤트만 전환으로 인정한다.
 */
object ExperimentConversionCalculator {

    val DEFAULT_CONVERSION_EVENT: String = ProductEventName.CHALLENGE_JOINED.value

    fun validateConversionEventName(rawEventName: String?): String {
        val candidate = rawEventName?.trim()?.takeIf { it.isNotEmpty() } ?: DEFAULT_CONVERSION_EVENT
        val validated = ProductEventName.validate(candidate)
        if (validated == ProductEventName.EXPERIMENT_EXPOSED.value) {
            throw BadRequestException("experiment_exposed는 목표 전환 이벤트(conversionEventName)로 지정할 수 없습니다.")
        }
        return validated
    }

    fun calculate(
        experimentKey: String,
        conversionEventName: String = DEFAULT_CONVERSION_EVENT,
        events: List<ProductEvent>
    ): ExperimentConversionSummary {
        val normalizedKey = Experiment.validateExperimentKey(experimentKey)
        val validatedConversionEvent = validateConversionEventName(conversionEventName)

        // 1. 해당 experimentKey에 대한 노출 이벤트 추출
        val exposureEventsByVariant = EnumMapOrLinkedMap<ExperimentVariant, MutableList<ProductEvent>>()
        for (variant in ExperimentVariant.entries) {
            exposureEventsByVariant[variant] = mutableListOf()
        }

        for (event in events) {
            if (event.eventName != ProductEventName.EXPERIMENT_EXPOSED.value) continue
            val ctx = ExperimentEventContext.extractFrom(event.properties) ?: continue
            if (ctx.experimentKey != normalizedKey) continue
            exposureEventsByVariant.getValue(ctx.variant).add(event)
        }

        // 2. 목표 전환 이벤트 목록
        val candidateConversionEvents = events.filter { it.eventName == validatedConversionEvent }

        // 3. Variant(A, B)별 고유 노출자·고유 전환자·Raw 이벤트 수·CVR 계산
        val variantMetrics = ExperimentVariant.entries.map { variant ->
            val variantExposures = exposureEventsByVariant.getValue(variant)
            val firstExposedAtByUser: Map<Long, LocalDateTime> = variantExposures
                .groupBy { it.userId }
                .mapValues { (_, userExposures) ->
                    userExposures.minOf { it.occurredAt }
                }

            val attributedConversions = candidateConversionEvents.filter { conversionEvent ->
                val firstExposedAt = firstExposedAtByUser[conversionEvent.userId]
                    ?: return@filter false

                // 노출 시점 이전에 발생한 이벤트는 실험에 의한 전환이 아니므로 제외
                if (conversionEvent.occurredAt.isBefore(firstExposedAt)) {
                    return@filter false
                }

                // 전환 이벤트에 Experiment Context가 명시되어 있다면 experimentKey와 variant가 일치해야 함
                val explicitContext = ExperimentEventContext.extractFrom(conversionEvent.properties)
                if (explicitContext != null) {
                    explicitContext.experimentKey == normalizedKey && explicitContext.variant == variant
                } else {
                    true
                }
            }

            val exposedUsers = firstExposedAtByUser.size.toLong()
            val exposureEventsCount = variantExposures.size.toLong()
            val convertedUsers = attributedConversions.mapTo( hashSetOf() ) { it.userId }.size.toLong()
            val conversionEventsCount = attributedConversions.size.toLong()

            VariantConversionMetrics(
                variant = variant,
                exposedUsers = exposedUsers,
                exposureEvents = exposureEventsCount,
                convertedUsers = convertedUsers,
                conversionEvents = conversionEventsCount,
                cvr = toRate(convertedUsers, exposedUsers)
            )
        }

        val totalExposedUsers = variantMetrics.sumOf { it.exposedUsers }
        val totalConvertedUsers = variantMetrics.sumOf { it.convertedUsers }

        return ExperimentConversionSummary(
            experimentKey = normalizedKey,
            conversionEventName = validatedConversionEvent,
            totalExposedUsers = totalExposedUsers,
            totalConvertedUsers = totalConvertedUsers,
            overallCvr = toRate(totalConvertedUsers, totalExposedUsers),
            variants = variantMetrics
        )
    }

    private fun <K, V> EnumMapOrLinkedMap(): MutableMap<K, V> = LinkedHashMap()

    /** 분모가 0이면 전환율은 0.0으로 둔다. 소수점 둘째 자리까지 반올림한다. */
    fun toRate(numerator: Long, denominator: Long): Double {
        if (denominator <= 0L) return 0.0
        return Math.round(numerator * 10000.0 / denominator) / 100.0
    }
}
