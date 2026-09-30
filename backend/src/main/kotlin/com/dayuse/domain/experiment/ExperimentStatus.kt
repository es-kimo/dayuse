package com.dayuse.domain.experiment

/**
 * Experiment 생명주기 상태. (F01, F08)
 *
 * 상태는 [DRAFT] -> [ACTIVE] -> [STOPPED] 단방향으로만 전이된다.
 * 이미 시작되었거나 종료된 실험을 되돌리지 못하게 막아,
 * 동일 `experimentKey` 아래에 서로 다른 실험 조건의 이벤트 데이터가 섞이는 문제를 방지한다.
 */
enum class ExperimentStatus {
    /** 노출 전 개발·검증 단계. 사용자에게 실험군(B)이 노출되지 않으며 기본 경험(Control/A)만 제공된다. */
    DRAFT,

    /** 실험 활성 단계. Rollout 비율 및 Variant 비율에 따라 배정·노출·이벤트 수집이 이루어진다. */
    ACTIVE,

    /** 실험 중단(종료) 단계. 신규 Variant 노출은 즉시 중단되지만 기존 수집된 분석 데이터는 그대로 유지된다. */
    STOPPED;

    fun canTransitionTo(target: ExperimentStatus): Boolean = when (this) {
        DRAFT -> target == ACTIVE
        ACTIVE -> target == STOPPED
        STOPPED -> false
    }
}
