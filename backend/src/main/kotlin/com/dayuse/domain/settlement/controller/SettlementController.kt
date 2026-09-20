package com.dayuse.domain.settlement.controller

import com.dayuse.domain.settlement.DepositReportStatus
import com.dayuse.domain.settlement.dto.CancelConfirmationRequest
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.DepositReportDetailResponse
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.dto.GroupAccountResponse
import com.dayuse.domain.settlement.dto.RejectDepositReportRequest
import com.dayuse.domain.settlement.dto.SettlementSummaryResponse
import com.dayuse.domain.settlement.dto.UnpaidRecordItemResponse
import com.dayuse.domain.settlement.service.SettlementService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
class SettlementController(
    private val settlementService: SettlementService
) {

    @GetMapping("/api/v1/groups/{groupId}/account")
    fun getGroupAccount(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<GroupAccountResponse?> {
        val response = settlementService.getGroupAccount(groupId, userId)
        return ResponseEntity.ok(response)
    }

    @PutMapping("/api/v1/groups/{groupId}/account")
    fun updateGroupAccount(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: GroupAccountRequest
    ): ResponseEntity<GroupAccountResponse> {
        val response = settlementService.updateGroupAccount(groupId, userId, request)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/groups/{groupId}/unpaid-records")
    fun getUnpaidRecords(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<List<UnpaidRecordItemResponse>> {
        val response = settlementService.getUnpaidRecords(groupId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/groups/{groupId}/deposit-reports")
    fun createDepositReport(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CreateDepositReportRequest
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.createDepositReport(groupId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @DeleteMapping("/api/v1/deposit-reports/{reportId}")
    fun cancelDepositReport(
        @PathVariable reportId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.cancelDepositReport(reportId, userId)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/groups/{groupId}/deposit-reports")
    fun getDepositReports(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @RequestParam(required = false) status: DepositReportStatus?
    ): ResponseEntity<List<DepositReportDetailResponse>> {
        val response = settlementService.getDepositReports(groupId, userId, status)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/deposit-reports/{reportId}")
    fun getDepositReportDetail(
        @PathVariable reportId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.getReportDetail(reportId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/deposit-reports/{reportId}/confirm")
    fun confirmDepositReport(
        @PathVariable reportId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.confirmDepositReport(reportId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/deposit-reports/{reportId}/reject")
    fun rejectDepositReport(
        @PathVariable reportId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: RejectDepositReportRequest
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.rejectDepositReport(reportId, userId, request)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/api/v1/deposit-reports/{reportId}/cancel-confirmation")
    fun cancelConfirmation(
        @PathVariable reportId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CancelConfirmationRequest
    ): ResponseEntity<DepositReportDetailResponse> {
        val response = settlementService.cancelConfirmation(reportId, userId, request)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/api/v1/groups/{groupId}/settlement-summary")
    fun getSettlementSummary(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<SettlementSummaryResponse> {
        val response = settlementService.getSettlementSummary(groupId, userId)
        return ResponseEntity.ok(response)
    }
}
