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

@Service
class FeatureFlagService(
    private val featureAssignmentRepository: FeatureAssignmentRepository,
    private val featureEventAsyncService: FeatureEventAsyncService,
    @Value("\${features.ui-refresh-01.enabled:true}") private val defaultUiRefreshEnabled: Boolean,
    @Value("\${features.ui-refresh-01.rollout-percentage:50}") private val defaultRolloutPercentage: Int
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

        // =========================================================================
        // TODO [사용자 미션 1]: QA 오버라이드 및 글로벌 비상 킬스위치(Kill-Switch) 판정
        // -------------------------------------------------------------------------
        // 1. QA/운영자 파라미터(normalizedOverride)가 "A" 또는 "B"인 경우:
        //    - 최우선 순위로 해당 variant를 반환합니다. (isOverride = true)
        // 2. 글로벌 비상 킬스위치가 활성화되어 있는 경우(isKillSwitchActive(featureKey) == true):
        //    - 장애 격리를 위해 기존 배정과 무관하게 즉시 안정 버전 "A"로 폴백 반환합니다.
        //      (variant = "A", isKillSwitchActive = true)
        // =========================================================================

        // 비로그인 사용자 기본 처리
        if (userId == null) {
            return FeatureAssignmentResponse(
                featureKey = featureKey,
                variant = "B",
                isOverride = false,
                isKillSwitchActive = false
            )
        }

        // =========================================================================
        // TODO [사용자 미션 2]: 계정별 고정 배정(Sticky Rollout) 조회 및 비율 기반 할당/영속화
        // -------------------------------------------------------------------------
        // 1. 기존 배정 내역 조회:
        //    - featureAssignmentRepository를 통해 해당 사용자(userId)와 featureKey로 저장된 배정이 있는지 조회합니다.
        //    - 이미 배정된 레코드가 존재하면, 기기/세션이 바뀌어도 동일한 버전을 제공하도록 해당 variant를 반환합니다.
        // 2. 신규 사용자 비율 기반 할당 (Canary Rollout):
        //    - getRolloutPercentage(featureKey)로 롤아웃 비율(0~100)을 가져옵니다.
        //    - userId와 featureKey의 해시값(예: Math.abs(Objects.hash(featureKey, userId)) % 100)을 계산합니다.
        //    - 버킷 값이 롤아웃 비율 미만이면 "B", 이상이면 "A"를 할당합니다.
        // 3. DB 영속화 및 동시성 예외 방어:
        //    - FeatureAssignment 엔티티를 생성하여 DB에 저장합니다.
        //    - 동시 요청으로 DataIntegrityViolationException(유니크 제약 충돌)이 발생할 경우,
        //      먼저 저장된 레코드를 다시 조회하여 안전하게 해당 variant를 반환하도록 예외를 핸들링합니다.
        // =========================================================================

        return FeatureAssignmentResponse(
            featureKey = featureKey,
            variant = "A",
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
        // =========================================================================
        // TODO [사용자 미션 3]: 인증 플로우 성공/실패 액션 판정 및 비동기 이벤트 연계
        // -------------------------------------------------------------------------
        // 1. 현재 사용자의 피처 버전(ui_refresh_01)을 getOrAssignVariant를 통해 조회합니다.
        // 2. isSuccess 여부에 따라 이벤트 타입을 결정합니다:
        //    - isSuccess == true  -> "CERT_FLOW_SUCCESS"
        //    - isSuccess == false -> "CERT_FLOW_FAIL"
        // 3. 메타데이터에 errorMessage가 존재하는 경우 ("error" 키) 함께 병합합니다.
        // 4. featureEventAsyncService.recordEventAsync를 호출하여 메인 트랜잭션과 격리된 비동기 로깅을 수행합니다.
        // =========================================================================
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
    fun setFeatureEnabled(featureKey: String, enabled: Boolean) {
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
    fun setRolloutPercentage(featureKey: String, percentage: Int) {
        rolloutOverrides[featureKey] = percentage.coerceIn(0, 100)
    }

    /**
     * 테스트 격리용 상태 리셋
     */
    fun resetOverrides() {
        killSwitchOverrides.clear()
        rolloutOverrides.clear()
    }
}
