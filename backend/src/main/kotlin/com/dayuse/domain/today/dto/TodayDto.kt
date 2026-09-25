package com.dayuse.domain.today.dto

import com.dayuse.domain.challenge.PeriodType
import java.time.LocalDate
import java.time.LocalDateTime

data class TodayVerificationSummary(
    val id: Long,
    val imageUrl: String,
    val comment: String?,
    val isLate: Boolean,
    val createdAt: LocalDateTime
)

data class TodayPeriodInfo(
    val index: Int,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val targetCount: Int,
    val completedCount: Int,
    val todayVerified: Boolean,
    val isGoalAchieved: Boolean,
    val summaryText: String
)

data class ChallengeTodayTodoResponse(
    val periodType: PeriodType,
    val periodInfo: TodayPeriodInfo?
)

data class TodayActionResponse(
    val challengeId: Long,
    val challengeTitle: String,
    val verificationCriteria: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val isCompletedToday: Boolean,
    val canVerify: Boolean,
    val myVerification: TodayVerificationSummary?,
    val groupId: Long? = null,
    val groupName: String? = null,
    val periodType: PeriodType = PeriodType.DAILY,
    val periodInfo: TodayPeriodInfo? = null
)
