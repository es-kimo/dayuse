package com.dayuse.domain.challenge.controller

import com.dayuse.domain.challenge.dto.ChallengeDetailResponse
import com.dayuse.domain.challenge.dto.ChallengeParticipantResponse
import com.dayuse.domain.challenge.dto.ChallengeSummaryResponse
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.JoinPreviewResponse
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups/{groupId}/challenges")
class GroupChallengeController(
    private val challengeService: ChallengeService
) {

    @PostMapping
    fun createChallenge(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CreateChallengeRequest
    ): ResponseEntity<ChallengeDetailResponse> {
        val response = challengeService.createChallenge(groupId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping
    fun getGroupChallenges(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @RequestParam(required = false) status: String?
    ): ResponseEntity<List<ChallengeSummaryResponse>> {
        val response = challengeService.getGroupChallenges(groupId, userId, status)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{challengeId}/preview-join")
    fun getGroupChallengeJoinPreview(
        @PathVariable groupId: Long,
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<JoinPreviewResponse> {
        val response = challengeService.getJoinPreview(challengeId, userId)
        return ResponseEntity.ok(response)
    }
}

@RestController
@RequestMapping("/api/v1/challenges/{challengeId}")
class ChallengeController(
    private val challengeService: ChallengeService
) {

    @GetMapping("/preview-join")
    fun getChallengeJoinPreview(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<JoinPreviewResponse> {
        val response = challengeService.getJoinPreview(challengeId, userId)
        return ResponseEntity.ok(response)
    }

    @GetMapping
    fun getChallengeDetail(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<ChallengeDetailResponse> {
        val response = challengeService.getChallengeDetail(challengeId, userId)
        return ResponseEntity.ok(response)
    }

    @PatchMapping
    fun updateChallenge(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UpdateChallengeRequest
    ): ResponseEntity<ChallengeDetailResponse> {
        val response = challengeService.updateChallenge(challengeId, userId, request)
        return ResponseEntity.ok(response)
    }

    @DeleteMapping
    fun deleteChallenge(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<Void> {
        challengeService.deleteChallenge(challengeId, userId)
        return ResponseEntity.noContent().build()
    }

    @PostMapping("/participants")
    fun joinChallenge(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: JoinChallengeRequest
    ): ResponseEntity<ChallengeParticipantResponse> {
        val response = challengeService.joinChallenge(challengeId, userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @DeleteMapping("/participants/me")
    fun leaveChallenge(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<Void> {
        challengeService.leaveChallenge(challengeId, userId)
        return ResponseEntity.noContent().build()
    }

    @PatchMapping("/participants/me")
    fun updateMyPenaltyAmount(
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UpdatePenaltyAmountRequest
    ): ResponseEntity<ChallengeParticipantResponse> {
        val response = challengeService.updateMyPenaltyAmount(challengeId, userId, request)
        return ResponseEntity.ok(response)
    }
}
