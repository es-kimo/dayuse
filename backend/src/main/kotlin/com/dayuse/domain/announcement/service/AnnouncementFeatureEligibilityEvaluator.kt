package com.dayuse.domain.announcement.service

import com.dayuse.domain.announcement.Announcement
import com.dayuse.domain.announcement.AnnouncementFeatureConditionType
import com.dayuse.domain.experiment.ExperimentVariant
import com.dayuse.domain.experiment.service.ExperimentService
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component

/**
 * 소식에 연결된 기능 제공 조건(`featureConditionType`, `featureKey`) 충족 여부를 판정한다 (v0.12 F06).
 *
 * ### 설계 원칙
 * 1. **위임 판정**: 공지 도메인이 자체적으로 기능을 활성화하거나 우회하지 않고,
 *    기존 실험/기능 제공 판정(`ExperimentService`)을 그대로 호출해 확인한다.
 * 2. **Fail-Safe 격리**: `featureKey`가 누락되었거나, 미존재·비활성 실험이거나, 판정 중 예외가 발생하면
 *    **예외를 밖으로 전파하지 않고 `false`(비노출)를 반환**하여 조건부 소식만 안전하게 숨기고
 *    전체 사용자용(`ALL_USERS`) 소식과 핵심 서비스가 정상 동작하도록 보장한다.
 */
@Component
class AnnouncementFeatureEligibilityEvaluator(
    private val experimentService: ExperimentService? = null
) {
    private val log = LoggerFactory.getLogger(javaClass)

    fun isEligible(userId: Long, announcement: Announcement): Boolean {
        return isEligible(
            userId = userId,
            conditionType = announcement.featureConditionType,
            featureKey = announcement.featureKey
        )
    }

    fun isEligible(
        userId: Long,
        conditionType: AnnouncementFeatureConditionType,
        featureKey: String?
    ): Boolean {
        if (userId <= 0L) {
            return false
        }

        // TODO [사용자 미션 3-1]: 기능 제공 조건(ALL_USERS / EXPERIMENT_PARTICIPANT / EXPERIMENT_VARIANT_B)을 판정하고,
        // featureKey 누락·미존재/비활성 실험·예외 발생 시 조건부 소식을 숨기는 Fail-Safe(false 반환)를 구현하세요.
        // - ALL_USERS 이면 항상 true
        // - 조건부 소식이면 experimentService.assignVariant(cleanedKey, userId) 결과를 위임받아 검증합니다.
        // - assignment.isFallback 이거나 !assignment.participating 이면 false
        // - EXPERIMENT_PARTICIPANT -> assignment.participating
        // - EXPERIMENT_VARIANT_B -> assignment.participating && assignment.variant == ExperimentVariant.B
        // - 판정 중 예외가 발생하면 로그를 남기고 false를 반환하여 전체 사용자용 소식과 핵심 서비스를 보호하세요.
        return false
    }
}
