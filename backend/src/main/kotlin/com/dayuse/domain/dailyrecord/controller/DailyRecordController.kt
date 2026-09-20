package com.dayuse.domain.dailyrecord.controller

import com.dayuse.domain.dailyrecord.dto.ChallengeCalendarResponse
import com.dayuse.domain.dailyrecord.dto.DailyRecordDetailResponse
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.dto.StatusSummaryResponse
import com.dayuse.domain.dailyrecord.dto.UncheckedRecordResponse
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.verification.dto.VerificationDetailResponse
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RestController

@RestController
class DailyRecordController(
    private val dailyRecordService: DailyRecordService
) {

    @GetMapping("/api/v1/groups/{groupId}/status-summary")
    fun getStatusSummary(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<StatusSummaryResponse> {
        val response = dailyRecordService.getStatusSummary(groupId, userId)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/groups/{groupId}/unchecked-records")
    fun getUncheckedRecords(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<List<UncheckedRecordResponse>> {
        val response = dailyRecordService.getUncheckedRecords(groupId, userId)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/challenges/{challengeId}/calendar")
    fun getChallengeCalendar(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<ChallengeCalendarResponse> {
        val response = dailyRecordService.getChallengeCalendar(challengeId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/daily-records/{recordId}/mark-failed")
    fun markFailed(
        @PathVariable recordId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<DailyRecordDetailResponse> {
        val response = dailyRecordService.markFailed(recordId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/daily-records/{recordId}/verify-late")
    fun verifyLate(
        @PathVariable recordId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: LateVerificationRequest
    ): ResponseEntity<VerificationDetailResponse> {
        val response = dailyRecordService.verifyLate(recordId, userId, request)
        return ResponseEntity.ok(response)
    }
}
