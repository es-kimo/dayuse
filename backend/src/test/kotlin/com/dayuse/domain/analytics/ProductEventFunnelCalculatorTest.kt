@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDateTime

class ProductEventFunnelCalculatorTest {

    private val started = ProductEventName.CERTIFICATION_STARTED.value
    private val completed = ProductEventName.CERTIFICATION_COMPLETED.value
    private val base: LocalDateTime = LocalDateTime.of(2026, 9, 30, 10, 0)

    private fun at(minutes: Long): LocalDateTime = base.plusMinutes(minutes)

    @Test
    @DisplayName("단계별 도달 사용자 수와 전환율을 고유 사용자 기준으로 계산한다")
    fun calculatesReachedUsersAndConversionRates() {
        val result = ProductEventFunnelCalculator.calculate(
            steps = listOf(started, completed),
            firstOccurrences = mapOf(
                1L to mapOf(started to at(0), completed to at(5)),
                2L to mapOf(started to at(1), completed to at(9)),
                3L to mapOf(started to at(2), completed to at(7)),
                4L to mapOf(started to at(3))
            )
        )

        assertEquals(2, result.size)
        assertEquals(4L, result[0].reachedUsers)
        assertEquals(100.0, result[0].stepConversionRate)
        assertEquals(3L, result[1].reachedUsers)
        assertEquals(75.0, result[1].stepConversionRate)
        assertEquals(75.0, result[1].overallConversionRate)
    }

    @Test
    @DisplayName("앞 단계보다 먼저 일어난 이벤트는 다음 단계 도달로 세지 않는다")
    fun doesNotCountOutOfOrderEvents() {
        val result = ProductEventFunnelCalculator.calculate(
            steps = listOf(started, completed),
            firstOccurrences = mapOf(
                // 인증 완료가 인증 시작보다 앞선 사용자. 이 퍼널의 전환으로 보지 않는다.
                1L to mapOf(started to at(10), completed to at(3)),
                2L to mapOf(started to at(0), completed to at(4))
            )
        )

        assertEquals(2L, result[0].reachedUsers)
        assertEquals(1L, result[1].reachedUsers)
        assertEquals(50.0, result[1].stepConversionRate)
    }

    @Test
    @DisplayName("3단계 퍼널에서 중간 단계를 건너뛴 사용자는 마지막 단계에 도달하지 못한 것으로 센다")
    fun dropsUsersWhoSkippedAnIntermediateStep() {
        val home = ProductEventName.HOME_VIEWED.value
        val created = ProductEventName.CHALLENGE_CREATED.value
        val joined = ProductEventName.CHALLENGE_JOINED.value

        val result = ProductEventFunnelCalculator.calculate(
            steps = listOf(home, created, joined),
            firstOccurrences = mapOf(
                1L to mapOf(home to at(0), created to at(1), joined to at(2)),
                // 생성 없이 참여만 한 사용자
                2L to mapOf(home to at(0), joined to at(2)),
                3L to mapOf(home to at(0), created to at(1))
            )
        )

        assertEquals(3L, result[0].reachedUsers)
        assertEquals(2L, result[1].reachedUsers)
        assertEquals(1L, result[2].reachedUsers)
        assertEquals(50.0, result[2].stepConversionRate)
        assertEquals(33.33, result[2].overallConversionRate)
    }

    @Test
    @DisplayName("같은 사용자가 같은 이벤트를 여러 번 발생시켜도 도달 사용자 수는 1로 센다")
    fun countsRepeatedEventsFromSameUserOnce() {
        // 최초 발생 시각만 들어오는 입력 구조 자체가 사용자당 1건으로 환원된 상태다.
        val result = ProductEventFunnelCalculator.calculate(
            steps = listOf(started, completed),
            firstOccurrences = mapOf(
                1L to mapOf(started to at(0), completed to at(1))
            )
        )

        assertEquals(1L, result[0].reachedUsers)
        assertEquals(1L, result[1].reachedUsers)
        assertEquals(100.0, result[1].overallConversionRate)
    }

    @Test
    @DisplayName("첫 단계 도달 사용자가 없으면 전환율은 0으로 두고 0 나눗셈을 하지 않는다")
    fun returnsZeroRatesWhenNoUsersReachedFirstStep() {
        val result = ProductEventFunnelCalculator.calculate(
            steps = listOf(started, completed),
            firstOccurrences = emptyMap()
        )

        assertEquals(0L, result[0].reachedUsers)
        assertEquals(0.0, result[0].stepConversionRate)
        assertEquals(0L, result[1].reachedUsers)
        assertEquals(0.0, result[1].overallConversionRate)
    }

    @Test
    @DisplayName("퍼널 단계 검증: 표준 이벤트 이름만, 2~7개, 중복 없이 허용한다")
    fun validatesSteps() {
        assertEquals(listOf(started, completed), ProductEventFunnelCalculator.validateSteps(listOf(started, completed)))

        assertThrows<BadRequestException> { ProductEventFunnelCalculator.validateSteps(listOf(started)) }
        assertThrows<BadRequestException> { ProductEventFunnelCalculator.validateSteps(listOf(started, started)) }
        assertThrows<BadRequestException> { ProductEventFunnelCalculator.validateSteps(listOf(started, "unknown_event")) }
        assertThrows<BadRequestException> {
            ProductEventFunnelCalculator.validateSteps(ProductEventName.entries.map { it.value } + started)
        }
    }

    @Test
    @DisplayName("프리셋 키로 정의된 퍼널을 찾고, 없는 키는 거부한다")
    fun resolvesPresets() {
        assertEquals(listOf(started, completed), FunnelPreset.from("certification").steps)
        assertEquals(FunnelPreset.CERTIFICATION, FunnelPreset.DEFAULT)
        assertThrows<BadRequestException> { FunnelPreset.from("anything") }
    }
}
