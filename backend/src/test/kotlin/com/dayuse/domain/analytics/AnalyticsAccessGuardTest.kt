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
    @DisplayName("로컬/테스트 기본값(allowAllWhenEmpty=true)에서는 허용 목록이 비어 있으면 로그인 사용자 누구나 통과한다")
    fun allowsEveryoneWhenNoAllowlistConfiguredInLocal() {
        val guard = AnalyticsAccessGuard(adminUserIdsProperty = "", allowAllWhenEmpty = true)
        assertDoesNotThrow { guard.verifyCanReadAnalytics(1L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(999L) }
    }

    @Test
    @DisplayName("운영(allowAllWhenEmpty=false)에서는 허용 목록이 비어 있으면 전원 403으로 차단한다 (Fail-Closed)")
    fun blocksEveryoneWhenNoAllowlistConfiguredInProd() {
        val guard = AnalyticsAccessGuard(adminUserIdsProperty = "", allowAllWhenEmpty = false)
        assertThrows<ForbiddenException> { guard.verifyCanReadAnalytics(1L) }
        assertThrows<ForbiddenException> { guard.verifyCanReadAnalytics(999L) }
    }

    @Test
    @DisplayName("허용 목록이 지정되면 목록에 있는 userId만 통과하고 나머지는 403으로 막는다")
    fun blocksUsersOutsideTheAllowlist() {
        val guard = AnalyticsAccessGuard(adminUserIdsProperty = "7, 12 ,x, 30", allowAllWhenEmpty = false)

        assertDoesNotThrow { guard.verifyCanReadAnalytics(7L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(12L) }
        assertDoesNotThrow { guard.verifyCanReadAnalytics(30L) }
        assertThrows<ForbiddenException> { guard.verifyCanReadAnalytics(8L) }
    }
}
