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

        if (conditionType == AnnouncementFeatureConditionType.ALL_USERS) {
            return true
        }

        val cleanedKey = featureKey?.trim()?.takeIf { it.isNotEmpty() } ?: return false
        val service = experimentService ?: return false

        return try {
            val assignment = service.assignVariant(
                experimentKey = cleanedKey,
                userId = userId
            )
            if (assignment.isFallback || !assignment.participating) {
                return false
            }

            when (conditionType) {
                AnnouncementFeatureConditionType.ALL_USERS -> true
                AnnouncementFeatureConditionType.EXPERIMENT_PARTICIPANT -> assignment.participating
                AnnouncementFeatureConditionType.EXPERIMENT_VARIANT_B -> {
                    assignment.participating && assignment.variant == ExperimentVariant.B
                }
            }
        } catch (ex: Exception) {
            log.warn(
                "Failed to evaluate feature eligibility for conditionType='{}', featureKey='{}', userId='{}'. Hiding conditional announcement safely.",
                conditionType,
                cleanedKey,
                userId,
                ex
            )
            false
        }
    }
}
