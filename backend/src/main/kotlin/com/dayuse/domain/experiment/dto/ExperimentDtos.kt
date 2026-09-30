package com.dayuse.domain.experiment.dto

import com.dayuse.domain.experiment.Experiment
import com.dayuse.domain.experiment.ExperimentAssignment
import com.dayuse.domain.experiment.ExperimentConversionSummary
import com.dayuse.domain.experiment.ExperimentFallbackReason
import com.dayuse.domain.experiment.ExperimentResolution
import com.dayuse.domain.experiment.ExperimentStatus
import com.dayuse.domain.experiment.ExperimentVariant
import com.dayuse.domain.experiment.ExperimentVariantRatio
import com.dayuse.domain.experiment.VariantConversionMetrics
import java.time.LocalDateTime

data class ExperimentCreateRequest(
    val experimentKey: String = "",
    val name: String = "",
    val rolloutPercentage: Int = Experiment.DEFAULT_ROLLOUT_PERCENTAGE,
    val variantARatio: Int = ExperimentVariantRatio.DEFAULT_A_RATIO,
    val variantBRatio: Int = ExperimentVariantRatio.DEFAULT_B_RATIO
)

data class ExperimentRolloutUpdateRequest(
    val rolloutPercentage: Int
)

data class ExperimentVariantRatioUpdateRequest(
    val variantARatio: Int,
    val variantBRatio: Int
)

data class ExperimentVariantRatioResponse(
    val a: Int,
    val b: Int
) {
    companion object {
        fun from(ratio: ExperimentVariantRatio): ExperimentVariantRatioResponse {
            return ExperimentVariantRatioResponse(
                a = ratio.a,
                b = ratio.b
            )
        }
    }
}

data class ExperimentResponse(
    val id: Long,
    val experimentKey: String,
    val name: String,
    val status: ExperimentStatus,
    val rolloutPercentage: Int,
    val variants: List<ExperimentVariant>,
    val variantRatio: ExperimentVariantRatioResponse,
    val defaultVariant: ExperimentVariant,
    val createdAt: LocalDateTime,
    val startedAt: LocalDateTime?,
    val endedAt: LocalDateTime?
) {
    companion object {
        fun from(experiment: Experiment): ExperimentResponse {
            return ExperimentResponse(
                id = experiment.id,
                experimentKey = experiment.experimentKey,
                name = experiment.name,
                status = experiment.status,
                rolloutPercentage = experiment.rolloutPercentage,
                variants = experiment.variants,
                variantRatio = ExperimentVariantRatioResponse.from(experiment.variantRatio),
                defaultVariant = experiment.defaultVariant,
                createdAt = experiment.createdAt,
                startedAt = experiment.startedAt,
                endedAt = experiment.endedAt
            )
        }
    }
}

data class ExperimentResolutionResponse(
    val experimentKey: String,
    val status: ExperimentStatus?,
    val variant: ExperimentVariant,
    val participating: Boolean,
    val rolloutPercentage: Int,
    val variantRatio: ExperimentVariantRatioResponse,
    val isFallback: Boolean,
    val fallbackReason: ExperimentFallbackReason
) {
    companion object {
        fun from(resolution: ExperimentResolution): ExperimentResolutionResponse {
            return ExperimentResolutionResponse(
                experimentKey = resolution.experimentKey,
                status = resolution.status,
                variant = resolution.variant,
                participating = resolution.participating,
                rolloutPercentage = resolution.rolloutPercentage,
                variantRatio = ExperimentVariantRatioResponse.from(resolution.variantRatio),
                isFallback = resolution.isFallback,
                fallbackReason = resolution.fallbackReason
            )
        }
    }
}

data class ExperimentAssignmentResponse(
    val experimentKey: String,
    val userId: Long,
    val status: ExperimentStatus?,
    val participating: Boolean,
    val variant: ExperimentVariant,
    val rolloutPercentage: Int,
    val rolloutBucket: Int?,
    val variantBucket: Int?,
    val isFallback: Boolean,
    val fallbackReason: ExperimentFallbackReason
) {
    companion object {
        fun from(assignment: ExperimentAssignment): ExperimentAssignmentResponse {
            return ExperimentAssignmentResponse(
                experimentKey = assignment.experimentKey,
                userId = assignment.userId,
                status = assignment.status,
                participating = assignment.participating,
                variant = assignment.variant,
                rolloutPercentage = assignment.rolloutPercentage,
                rolloutBucket = assignment.rolloutBucket,
                variantBucket = assignment.variantBucket,
                isFallback = assignment.isFallback,
                fallbackReason = assignment.fallbackReason
            )
        }
    }
}

data class VariantConversionMetricResponse(
    val variant: ExperimentVariant,
    val exposedUsers: Long,
    val exposureEvents: Long,
    val convertedUsers: Long,
    val conversionEvents: Long,
    val cvr: Double
) {
    companion object {
        fun from(metrics: VariantConversionMetrics): VariantConversionMetricResponse {
            return VariantConversionMetricResponse(
                variant = metrics.variant,
                exposedUsers = metrics.exposedUsers,
                exposureEvents = metrics.exposureEvents,
                convertedUsers = metrics.convertedUsers,
                conversionEvents = metrics.conversionEvents,
                cvr = metrics.cvr
            )
        }
    }
}

data class ExperimentConversionReportResponse(
    val experimentKey: String,
    val name: String,
    val status: ExperimentStatus,
    val rolloutPercentage: Int,
    val variantRatio: ExperimentVariantRatioResponse,
    val conversionEventName: String,
    val startedAt: LocalDateTime?,
    val endedAt: LocalDateTime?,
    val totalExposedUsers: Long,
    val totalConvertedUsers: Long,
    val overallCvr: Double,
    val variants: List<VariantConversionMetricResponse>
) {
    companion object {
        fun from(
            experiment: Experiment,
            summary: ExperimentConversionSummary
        ): ExperimentConversionReportResponse {
            return ExperimentConversionReportResponse(
                experimentKey = experiment.experimentKey,
                name = experiment.name,
                status = experiment.status,
                rolloutPercentage = experiment.rolloutPercentage,
                variantRatio = ExperimentVariantRatioResponse.from(experiment.variantRatio),
                conversionEventName = summary.conversionEventName,
                startedAt = experiment.startedAt,
                endedAt = experiment.endedAt,
                totalExposedUsers = summary.totalExposedUsers,
                totalConvertedUsers = summary.totalConvertedUsers,
                overallCvr = summary.overallCvr,
                variants = summary.variants.map { VariantConversionMetricResponse.from(it) }
            )
        }
    }
}
