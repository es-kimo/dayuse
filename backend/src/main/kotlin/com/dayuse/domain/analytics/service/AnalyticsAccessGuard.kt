package com.dayuse.domain.analytics.service

import com.dayuse.global.exception.ForbiddenException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * 집계·퍼널 조회 및 실험 운영(생성·시작·종료·결과 조회) API 접근 제어.
 *
 * - 로컬/테스트(`allowAllWhenEmpty = true`): `analytics.admin-user-ids`가 비어 있으면 로그인 사용자 누구나 호출 가능
 * - 운영(`prod`, `allowAllWhenEmpty = false`): `analytics.admin-user-ids`가 비어 있으면 전원 403 차단(Fail-Closed)하며,
 *   명시적으로 등록된 관리자 `userId`만 통과시킨다.
 */
@Component
class AnalyticsAccessGuard(
    @Value("\${analytics.admin-user-ids:}") adminUserIdsProperty: String,
    @Value("\${analytics.allow-all-when-empty:true}") private val allowAllWhenEmpty: Boolean = true
) {
    private val adminUserIds: Set<Long> = adminUserIdsProperty
        .split(",")
        .mapNotNull { it.trim().takeIf(String::isNotEmpty)?.toLongOrNull() }
        .toSet()

    fun verifyCanReadAnalytics(userId: Long) {
        if (adminUserIds.isEmpty()) {
            if (allowAllWhenEmpty) return
            throw ForbiddenException("관리자 권한(ANALYTICS_ADMIN_USER_IDS)이 설정되지 않았거나 접근 권한이 없습니다.")
        }
        if (userId !in adminUserIds) {
            throw ForbiddenException("분석 집계 및 실험 관리 권한이 없습니다.")
        }
    }
}
