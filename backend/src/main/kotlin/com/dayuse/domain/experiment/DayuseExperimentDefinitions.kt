package com.dayuse.domain.experiment

import com.dayuse.domain.experiment.dto.ExperimentCreateRequest

/**
 * Dayuse에서 실제로 운영하는 Experiment 정의 목록. (v0.10 F09-1)
 *
 * ### 실험 종료 후 정리 절차 (운영 정책)
 * 1. `PATCH/POST /api/v1/experiments/{key}/stop`으로 실험을 `STOPPED`로 전환한다.
 *    이 시점부터 신규 노출이 멈추고 모든 사용자는 기본 경험(Variant A)을 받는다.
 * 2. `GET /api/v1/experiments/{key}/results`로 Variant별 CVR을 확정해 기록한다.
 *    과거 `ProductEvent`는 삭제하지 않으므로 종료 이후에도 같은 결과를 다시 조회할 수 있다.
 * 3. 승자 Variant의 문구를 기본 문구로 승격한다(프론트엔드 상수 교체).
 * 4. 화면에서 `useExperiment`/`useExperimentExposure` 호출과 `variant === 'B'` 분기를 제거한다.
 * 5. 이 목록에서 해당 정의를 지운다. 실험 키는 재사용하지 않고 다음 실험은 새 버전 키(`-v2`)를 발급한다.
 */
object DayuseExperimentDefinitions {

    /**
     * 첫 Dayuse A/B Test: 챌린지 참여 화면의 초대 안내 문구.
     *
     * 문구 외의 UI·색상·레이아웃·기능은 A와 B가 완전히 동일하다(단일 변인 통제).
     * 전환 이벤트는 `challenge_joined`이다.
     */
    const val CHALLENGE_INVITE_COPY_V1 = "challenge-invite-copy-v1"

    /** ViewB 신규 생성: 기본 허용인 기존 카드와 추천 안내 UI를 비교한다. */
    const val CHALLENGE_REDAY_UI_V1 = "challenge-reday-ui-v1"

    /**
     * 기동 시 멱등하게 보장할 정의 목록.
     *
     * 상태는 항상 `DRAFT`로 만들어진다. 노출 시작은 운영자가 activate API로 명시적으로 결정한다.
     * 이미 존재하는 실험은 상태·rollout을 포함해 아무것도 덮어쓰지 않는다.
     */
    val SEEDS: List<ExperimentCreateRequest> = listOf(
        ExperimentCreateRequest(
            experimentKey = CHALLENGE_REDAY_UI_V1,
            name = "챌린지 생성 리데이 허용 UI 실험",
            rolloutPercentage = 100,
            variantARatio = 50,
            variantBRatio = 50
        ),
        ExperimentCreateRequest(
            experimentKey = CHALLENGE_INVITE_COPY_V1,
            name = "챌린지 참여 화면 초대 문구 실험",
            rolloutPercentage = 100,
            variantARatio = 50,
            variantBRatio = 50
        )
    )
}
