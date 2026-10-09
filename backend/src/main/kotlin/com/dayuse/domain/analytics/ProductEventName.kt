package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException

enum class ProductEventName(val value: String) {
    HOME_VIEWED("home_viewed"),
    CERTIFICATION_STARTED("certification_started"),
    CERTIFICATION_COMPLETED("certification_completed"),
    CERTIFICATION_FAILED("certification_failed"),
    CHALLENGE_CREATED("challenge_created"),
    CHALLENGE_CREATED_REDAY_ALLOWED("challenge_created_reday_allowed"),
    CHALLENGE_JOINED("challenge_joined"),
    SHARE_CLICKED("share_clicked"),

    /** 실험 대상 UI가 실제로 사용자에게 노출된 시점의 Exposure 기록. (v0.10 F05) */
    EXPERIMENT_EXPOSED("experiment_exposed"),

    // ── v0.11 F13: 리데이·광고·티켓 이벤트 ─────────────────────────────
    // 내부 이벤트 식별자는 사용자 노출 명칭(리데이)과 분리해 `recovery_*`를 유지한다.

    /** 지각 인증(리데이 가능 구간 이후 인증) 등록 완료. */
    LATE_CERTIFICATION_COMPLETED("late_certification_completed"),

    /** 지각 인증 직후 리데이 사용 경로를 실제로 제시할 수 있는 상태가 됨. */
    RECOVERY_OFFERED("recovery_offered"),

    /** 사용자가 리데이 안내에서 사용/획득 경로로 진입함. (클라이언트 행동) */
    RECOVERY_STARTED("recovery_started"),

    /** 티켓이 실제로 소비되어 벌금이 면제됨. 서버 최초 처리 1건당 1회. */
    RECOVERY_COMPLETED("recovery_completed"),

    /** 리데이 가능 기한이 지나 더 이상 사용할 수 없게 됨. */
    RECOVERY_EXPIRED("recovery_expired"),

    /** 리데이 처리 실패(불가 사유·통신 실패 등). */
    RECOVERY_FAILED("recovery_failed"),

    /** 보상형 광고 세션 발급 요청. */
    AD_REQUESTED("ad_requested"),

    /** 광고 세션 발급 성공(소재 선택 완료). */
    AD_SERVED("ad_served"),

    /** 광고가 실제로 화면에 노출됨. 세션당 최초 노출 1회. */
    AD_IMPRESSION("ad_impression"),

    /** 광고 시청 완료 판정. 세션당 1회. */
    AD_COMPLETED("ad_completed"),

    /** 광고 시청 중단. 세션당 1회. */
    AD_ABANDONED("ad_abandoned"),

    /** 노출 가능한 광고가 없음(광고 없음·일일 상한 도달). */
    AD_UNAVAILABLE("ad_unavailable"),

    /**
     * 광고 보상 지급 확정. `recovery_ticket_granted`와 같은 지급 건을 가리키므로
     * 두 이벤트를 더해 보상 수량으로 집계하면 2배가 된다.
     */
    REWARD_GRANTED("reward_granted"),

    /** 리데이 티켓 발급. `rewardHistoryId`로 `reward_granted`와 동일 지급 건을 참조한다. */
    RECOVERY_TICKET_GRANTED("recovery_ticket_granted"),

    /** 리데이 티켓 소비. 티켓 1장당 1회. */
    RECOVERY_TICKET_USED("recovery_ticket_used"),

    // ── v0.12 F10: 공지 분석 이벤트 ────────────────────────────────────

    /** 홈 카드 또는 인라인 안내가 실제 화면에 표시될 때 기록 (동일 화면 방문 내 중복 방지). */
    ANNOUNCEMENT_IMPRESSION("announcement_impression"),

    /** 사용자가 소식 상세 콘텐츠를 정상적으로 열람했을 때 기록. */
    ANNOUNCEMENT_OPENED("announcement_opened"),

    /** 사용자가 안내를 닫았을 때 기록. */
    ANNOUNCEMENT_DISMISSED("announcement_dismissed"),

    /** 사용자가 안내 내 실행(CTA) 버튼을 눌렀을 때 기록. */
    ANNOUNCEMENT_CTA_CLICKED("announcement_cta_clicked");

    companion object {
        private val SNAKE_CASE_REGEX = Regex("^[a-z][a-z0-9_]*$")
        private val ALLOWED_NAMES: Set<String> = entries.map { it.value }.toSet()

        fun isAllowed(eventName: String): Boolean {
            return eventName in ALLOWED_NAMES
        }

        fun validate(eventName: String): String {
            val trimmed = eventName.trim()
            if (trimmed.isEmpty()) {
                throw BadRequestException("eventName은 비어 있을 수 없습니다.")
            }
            if (!SNAKE_CASE_REGEX.matches(trimmed)) {
                throw BadRequestException("유효하지 않은 eventName 형식입니다: $eventName")
            }
            if (!isAllowed(trimmed)) {
                throw BadRequestException("지원하지 않는 Product Event 이름입니다: $eventName")
            }
            return trimmed
        }
    }
}
