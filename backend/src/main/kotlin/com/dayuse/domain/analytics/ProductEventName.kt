package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException

enum class ProductEventName(val value: String) {
    HOME_VIEWED("home_viewed"),
    CERTIFICATION_STARTED("certification_started"),
    CERTIFICATION_COMPLETED("certification_completed"),
    CERTIFICATION_FAILED("certification_failed"),
    CHALLENGE_CREATED("challenge_created"),
    CHALLENGE_JOINED("challenge_joined"),
    SHARE_CLICKED("share_clicked");

    companion object {
        private val SNAKE_CASE_REGEX = Regex("^[a-z][a-z0-9_]*$")
        private val ALLOWED_NAMES: Set<String> = entries.map { it.value }.toSet()

        fun isAllowed(eventName: String): Boolean {
            return eventName in ALLOWED_NAMES
        }

        fun validate(eventName: String): String {
            // TODO [사용자 미션 2]:
            // 1) 입력된 eventName의 앞뒤 공백을 제거하고, 비어있는지 검사하세요.
            // 2) SNAKE_CASE_REGEX 형식과 초기 표준 이벤트 7종(isAllowed)에 속하는지 검증하세요.
            // 3) 위반 시 BadRequestException을 던지고, 통과 시 정제된 이벤트 이름을 반환하세요.
            return eventName
        }
    }
}
