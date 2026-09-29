package com.dayuse.domain.feature.service

import com.dayuse.domain.feature.FeatureAssignment
import com.dayuse.domain.feature.FeatureAssignmentRepository
import com.dayuse.domain.feature.dto.CertFlowActionType
import com.dayuse.domain.feature.dto.FeatureAssignmentResponse
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Objects
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.abs

@Service
class FeatureFlagService(
    private val featureAssignmentRepository: FeatureAssignmentRepository,
    private val featureEventAsyncService: FeatureEventAsyncService,
    @Value("\${features.ui-refresh-01.enabled:true}") private val defaultUiRefreshEnabled: Boolean,
    @Value("\${features.ui-refresh-01.rollout-percentage:100}") private val defaultRolloutPercentage: Int
) {
    private val log = LoggerFactory.getLogger(javaClass)

    // 런타임 킬스위치 오버라이드 저장소 (긴급 원복 및 테스트 제어용)
    private val killSwitchOverrides = ConcurrentHashMap<String, Boolean>()
    private val rolloutOverrides = ConcurrentHashMap<String, Int>()

    /**
     * 계정별 피처 플래그 배정 및 판정 엔진
     * 우선순위:
     * 1. QA/운영자 쿼리 파라미터 강제 오버라이드 (?ui_variant=B)
     * 2. 글로벌 비상 킬스위치 (Kill-Switch 활성화 시 무조건 안정 버전 'A'로 폴백)
     * 3. DB 기 배정 내역 조회 (Sticky Assignment - 기기/세션 변경 시에도 동일 버전 보장)
     * 4. 신규 유저 비율 기반(해시 모듈로) 할당 및 DB 영속화
     */
    fun getOrAssignVariant(
        userId: Long?,
        featureKey: String,
        overrideVariant: String? = null
    ): FeatureAssignmentResponse {
        val normalizedOverride = overrideVariant?.trim()?.uppercase()

        // 1. QA / 운영자 파라미터 강제 오버라이드 검사
        if (normalizedOverride == "A" || normalizedOverride == "B") {
            log.info(
                "QA/Admin override applied: key={}, variant={}",
                featureKey,
                normalizedOverride
            )
            return FeatureAssignmentResponse(
                featureKey = featureKey,
                variant = normalizedOverride,
                isOverride = true,
                isKillSwitchActive = isKillSwitchActive(featureKey)
            )
        }

        // 2. 글로벌 비상 킬스위치 검사
        if (isKillSwitchActive(featureKey)) {
            log.warn(
                "Emergency Kill-Switch ACTIVE for feature: {}. Falling back to Variant A.",
                featureKey
            )
            return FeatureAssignmentResponse(
                featureKey = featureKey,
                variant = "A",
                isOverride = false,
                isKillSwitchActive = true
            )
        }

        // 비로그인 사용자 기본 처리
        if (userId == null) {
            return FeatureAssignmentResponse(
                featureKey = featureKey,
                variant = "B",
                isOverride = false,
                isKillSwitchActive = false
            )
        }

        // 4. 로그인 사용자 계정 단위 고정 배정 (Sticky Rollout)
        val existingAssignment = featureAssignmentRepository.findByUserIdAndFeatureKey(
            userId,
            featureKey
        )
        if (existingAssignment != null) {
            return FeatureAssignmentResponse(
                featureKey = featureKey,
                variant = existingAssignment.variant,
                isOverride = false,
                isKillSwitchActive = false
            )
        }

        // 5. 신규 사용자 비율 기반 할당 및 DB 영속화
        val rolloutRate = getRolloutPercentage(featureKey)
        val bucket = (abs(
            Objects.hash(
                featureKey,
                userId
            )
        ) % 100)
        val assignedVariant = if (bucket < rolloutRate) "B" else "A"

        val savedVariant = try {
            val newAssignment = FeatureAssignment(
                userId = userId,
                featureKey = featureKey,
                variant = assignedVariant
            )
            featureAssignmentRepository.save(newAssignment).variant
        } catch (ex: DataIntegrityViolationException) {
            // 동시성 요청 경합 시 DB 유니크 제약(uk_feature_assignment_user_key)에 의해
            // 먼저 삽입된 레코드를 안전하게 재조회하여 정합성을 보장합니다.
            featureAssignmentRepository.findByUserIdAndFeatureKey(
                userId,
                featureKey
            )?.variant ?: assignedVariant
        }

        return FeatureAssignmentResponse(
            featureKey = featureKey,
            variant = savedVariant,
            isOverride = false,
            isKillSwitchActive = false
        )
    }

    /**
     * 인증 플로우 액션 판정 및 비동기 이벤트 로깅
     */
    fun evaluateAndLogCertAction(
        userId: Long,
        isSuccess: Boolean,
        errorMessage: String? = null,
        metadata: Map<String, Any>? = null
    ) {
        val assignment = getOrAssignVariant(
            userId,
            "ui_refresh_01"
        )
        val eventType = if (isSuccess) "CERT_FLOW_SUCCESS" else "CERT_FLOW_FAIL"

        val combinedMetadata = HashMap<String, Any>()
        if (metadata != null) {
            combinedMetadata.putAll(metadata)
        }
        if (!isSuccess && errorMessage != null) {
            combinedMetadata["error"] = errorMessage
        }

        featureEventAsyncService.recordEventAsync(
            userId = userId,
            featureKey = "ui_refresh_01",
            variant = assignment.variant,
            eventType = eventType,
            metadata = combinedMetadata
        )
    }

    /**
     * 비상 킬스위치 상태 조회
     */
    fun isKillSwitchActive(featureKey: String): Boolean {
        // 런타임 오버라이드가 설정되어 있으면 해당 값 우선 (enabled=false 면 킬스위치 active)
        val runtimeOverride = killSwitchOverrides[featureKey]
        if (runtimeOverride != null) {
            return !runtimeOverride
        }
        // 기본 프로퍼티 조회
        return if (featureKey == "ui_refresh_01") {
            !defaultUiRefreshEnabled
        } else {
            false
        }
    }

    /**
     * 런타임 킬스위치 설정 (무중단 긴급 원복 제어용)
     * @param enabled true: 정상 서비스, false: 킬스위치 발동(모두 A로 폴백)
     */
    fun setFeatureEnabled(
        featureKey: String,
        enabled: Boolean
    ) {
        killSwitchOverrides[featureKey] = enabled
    }

    /**
     * 롤아웃 비율 조회
     */
    fun getRolloutPercentage(featureKey: String): Int {
        return rolloutOverrides[featureKey] ?: if (featureKey == "ui_refresh_01") {
            defaultRolloutPercentage
        } else {
            100
        }
    }

    /**
     * 롤아웃 비율 변경 (점진적 롤아웃 제어용)
     */
    fun setRolloutPercentage(
        featureKey: String,
        percentage: Int
    ) {
        rolloutOverrides[featureKey] = percentage.coerceIn(
            0,
            100
        )
    }

    /**
     * 테스트 격리용 상태 리셋
     */
    fun resetOverrides() {
        killSwitchOverrides.clear()
        rolloutOverrides.clear()
    }
}
