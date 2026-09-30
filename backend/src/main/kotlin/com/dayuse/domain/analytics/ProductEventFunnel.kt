package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import java.time.LocalDateTime

/** 퍼널 한 단계의 집계 결과. */
data class FunnelStepResult(
    val step: Int,
    val eventName: String,
    val reachedUsers: Long,
    /** 직전 단계 대비 전환율(%). 첫 단계는 100.0. */
    val stepConversionRate: Double,
    /** 첫 단계 대비 누적 전환율(%). */
    val overallConversionRate: Double
)

/** 미리 정의된 주요 행동 퍼널. 임의 퍼널 빌더 대신 실제로 보는 흐름만 이름으로 제공한다. */
enum class FunnelPreset(val key: String, val steps: List<String>) {
    CERTIFICATION(
        "certification",
        listOf(
            ProductEventName.CERTIFICATION_STARTED.value,
            ProductEventName.CERTIFICATION_COMPLETED.value
        )
    ),
    CHALLENGE(
        "challenge",
        listOf(
            ProductEventName.HOME_VIEWED.value,
            ProductEventName.CHALLENGE_CREATED.value,
            ProductEventName.CHALLENGE_JOINED.value
        )
    );

    companion object {
        val DEFAULT: FunnelPreset = CERTIFICATION

        fun from(key: String): FunnelPreset {
            return entries.firstOrNull { it.key.equals(key.trim(), ignoreCase = true) }
                ?: throw BadRequestException(
                    "지원하지 않는 퍼널입니다: $key (사용 가능: ${entries.joinToString(", ") { it.key }})"
                )
        }
    }
}

/**
 * 순서가 지정된 이벤트 목록에 대한 단계별 도달 사용자 수와 전환율 계산. (F06-2)
 *
 * 집계 기준:
 * - 도달 사용자 수는 항상 고유 사용자(userId) 기준이다. 같은 사용자가 같은 이벤트를 100번 발생시켜도 1로 센다.
 * - 단계는 순서를 지킨다. 사용자의 단계 i 최초 발생 시각이 단계 i-1 도달 시각보다 앞서면 그 사용자는
 *   "앞 단계를 거친 뒤 다음 단계에 도달"한 것이 아니므로 단계 i에 세지 않는다.
 *   (조회 기간 안에서 각 사용자의 최초 발생 시각을 기준으로 판정한다.)
 * - 따라서 도달 사용자 수는 단계가 뒤로 갈수록 절대 늘어나지 않는다.
 */
object ProductEventFunnelCalculator {

    const val MIN_STEPS = 2
    const val MAX_STEPS = 7

    fun validateSteps(steps: List<String>): List<String> {
        val normalized = steps.map { ProductEventName.validate(it) }
        if (normalized.size < MIN_STEPS) {
            throw BadRequestException("퍼널은 최소 ${MIN_STEPS}개 단계가 필요합니다.")
        }
        if (normalized.size > MAX_STEPS) {
            throw BadRequestException("퍼널은 최대 ${MAX_STEPS}개 단계까지만 허용됩니다.")
        }
        if (normalized.toSet().size != normalized.size) {
            throw BadRequestException("퍼널 단계에 같은 이벤트를 두 번 넣을 수 없습니다.")
        }
        return normalized
    }

    /**
     * @param steps 순서가 지정된 이벤트 이름 목록
     * @param firstOccurrences 사용자별 (이벤트 이름 -> 조회 기간 내 최초 발생 시각)
     */
    fun calculate(
        steps: List<String>,
        firstOccurrences: Map<Long, Map<String, LocalDateTime>>
    ): List<FunnelStepResult> {
        // 단계를 하나씩 통과시키며 살아남은 사용자와 그 사용자의 현재 단계 도달 시각을 들고 간다.
        var survivors: Map<Long, LocalDateTime> = firstOccurrences
            .mapNotNull { (userId, byEvent) ->
                byEvent[steps.first()]?.let { userId to it }
            }
            .toMap()

        val firstStepUsers = survivors.size.toLong()
        val results = mutableListOf(
            FunnelStepResult(
                step = 1,
                eventName = steps.first(),
                reachedUsers = firstStepUsers,
                stepConversionRate = if (firstStepUsers > 0L) 100.0 else 0.0,
                overallConversionRate = if (firstStepUsers > 0L) 100.0 else 0.0
            )
        )

        steps.drop(1).forEachIndexed { index, eventName ->
            val previousUsers = survivors.size.toLong()
            survivors = survivors
                .mapNotNull { (userId, reachedAt) ->
                    val occurredAt = firstOccurrences[userId]?.get(eventName)
                    // 앞 단계 도달 시각보다 앞서 일어난 이벤트는 이 퍼널의 다음 단계로 보지 않는다.
                    if (occurredAt != null && !occurredAt.isBefore(reachedAt)) userId to occurredAt else null
                }
                .toMap()

            val reachedUsers = survivors.size.toLong()
            results += FunnelStepResult(
                step = index + 2,
                eventName = eventName,
                reachedUsers = reachedUsers,
                stepConversionRate = toRate(reachedUsers, previousUsers),
                overallConversionRate = toRate(reachedUsers, firstStepUsers)
            )
        }

        return results
    }

    /** 분모가 0이면 전환율은 0.0으로 둔다. 소수점 둘째 자리까지 반올림한다. */
    private fun toRate(numerator: Long, denominator: Long): Double {
        if (denominator <= 0L) return 0.0
        return Math.round(numerator * 10000.0 / denominator) / 100.0
    }
}
