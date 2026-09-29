package com.dayuse.domain.feature.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class FeatureAssignmentResponse(
    val featureKey: String,
    val variant: String,
    val isOverride: Boolean = false,
    val isKillSwitchActive: Boolean = false
)

data class FeatureEventRequest(
    @field:NotBlank(message = "피처 키는 필수입니다.")
    @field:Size(max = 64)
    val featureKey: String,

    @field:NotBlank(message = "버전 정보는 필수입니다.")
    @field:Size(max = 16)
    val variant: String,

    @field:NotBlank(message = "이벤트 타입은 필수입니다.")
    @field:Size(max = 32)
    val eventType: String,

    val metadata: Map<String, Any>? = null
)

data class FeatureEventResponse(
    val id: Long,
    val status: String = "recorded"
)

enum class CertFlowActionType {
    ENTER,
    SUCCESS,
    FAIL
}
