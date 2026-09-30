package com.dayuse.domain.analytics.service

import com.dayuse.global.exception.ForbiddenException
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component

/**
 * 집계·퍼널 조회 API 접근 제어.
 *
 * 아직 이 서비스에는 역할(Role) 모델이 없어서, 운영에서 열람 가능한 사용자를 설정값으로 못 박는다.
 * `analytics.admin-user-ids`가 비어 있으면(로컬/개발 기본값) 로그인한 사용자 누구나 볼 수 있고,
 * 값이 지정되면 그 목록에 있는 userId만 통과한다.
 */
@Component
class AnalyticsAccessGuard(
    @Value("\${analytics.admin-user-ids:}") adminUserIdsProperty: String
) {
    private val adminUserIds: Set<Long> = adminUserIdsProperty
        .split(",")
        .mapNotNull { it.trim().takeIf(String::isNotEmpty)?.toLongOrNull() }
        .toSet()

    fun verifyCanReadAnalytics(userId: Long) {
        if (adminUserIds.isEmpty()) return
        if (userId !in adminUserIds) {
            throw ForbiddenException("분석 집계 조회 권한이 없습니다.")
        }
    }
}
