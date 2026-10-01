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
    EXPERIMENT_EXPOSED("experiment_exposed");

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
