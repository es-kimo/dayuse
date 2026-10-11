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
        // 결과 조회 시 내부적으로 온디맨드 집계가 가능하거나 즉시 집계 수행
        val result = challengeResultService.aggregateAndSave(challengeId)
        return ResponseEntity.ok(result)
    }
}
