package com.dayuse.domain.today.controller

import com.dayuse.domain.today.dto.TodayActionResponse
import com.dayuse.domain.today.service.TodayService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups/{groupId}/today")
class TodayController(
    private val todayService: TodayService
) {

    @GetMapping
    fun getTodayActions(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<List<TodayActionResponse>> {
        val response = todayService.getTodayActions(groupId, userId)
        return ResponseEntity.ok(response)
    }
}
