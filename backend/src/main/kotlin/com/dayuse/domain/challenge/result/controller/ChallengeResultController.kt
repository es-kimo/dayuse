package com.dayuse.domain.challenge.result.controller

import com.dayuse.domain.challenge.result.dto.ChallengeResultResponse
import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups/{groupId}/challenges/{challengeId}/result")
class ChallengeResultController(
    private val challengeResultService: ChallengeResultService
) {

    @GetMapping
    fun getChallengeResult(
        @PathVariable groupId: Long,
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<ChallengeResultResponse> {
        val result = challengeResultService.getResult(groupId, challengeId, userId)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/aggregate")
    fun triggerAggregation(
        @PathVariable groupId: Long,
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<ChallengeResultResponse> {
        val result = challengeResultService.aggregateAndSave(challengeId)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/acknowledge")
    fun acknowledgeResult(
        @PathVariable groupId: Long,
        @PathVariable challengeId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<com.dayuse.domain.challenge.result.dto.ChallengeParticipantResultResponse> {
        val result = challengeResultService.acknowledgeResult(groupId, challengeId, userId)
        return ResponseEntity.ok(result)
    }
}

@RestController
@RequestMapping("/api/v1/challenges")
class EndedChallengeController(
    private val challengeResultService: ChallengeResultService
) {
    @GetMapping("/ended-summary")
    fun getEndedChallengesSummary(
        @CurrentUserId userId: Long
    ): ResponseEntity<com.dayuse.domain.challenge.result.dto.EndedChallengesSummaryResponse> {
        val response = challengeResultService.getEndedChallengesSummary(userId)
        return ResponseEntity.ok(response)
    }
}
