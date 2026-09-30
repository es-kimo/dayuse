@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.analytics

import com.dayuse.domain.analytics.service.AnalyticsAccessGuard
import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertDoesNotThrow
import org.junit.jupiter.api.assertThrows

class AnalyticsAccessGuardTest {

    @Test
    @DisplayName("허용 목록이 비어 있으면(로컬/개발 기본값) 로그인 사용자 누구나 조회할 수 있다")
    fun allowsEveryoneWhenNoAllowlistConfigured() {
        val guard = AnalyticsAccessGuard("")
        assertDoesNotThrow { guard.verifyCanReadAnalytics(1L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(999L) }
    }

    @Test
    @DisplayName("허용 목록이 지정되면 목록에 없는 사용자는 403으로 막는다")
    fun blocksUsersOutsideTheAllowlist() {
        val guard = AnalyticsAccessGuard("7, 12 ,x, 30")

        assertDoesNotThrow { guard.verifyCanReadAnalytics(7L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(12L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(30L) }
        assertThrows<ForbiddenException> { guard.verifyCanReadAnalytics(8L) }
    }
}
