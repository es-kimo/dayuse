package com.dayuse.domain.today.dto

import java.time.LocalDate
import java.time.LocalDateTime

data class TodayVerificationSummary(
    val id: Long,
    val imageUrl: String,
    val comment: String?,
    val isLate: Boolean,
    val createdAt: LocalDateTime
)

data class TodayActionResponse(
    val challengeId: Long,
    val challengeTitle: String,
    val verificationCriteria: String,
    val startDate: LocalDate,
    val endDate: LocalDate,
    val isCompletedToday: Boolean,
    val canVerify: Boolean,
    val myVerification: TodayVerificationSummary?
)
