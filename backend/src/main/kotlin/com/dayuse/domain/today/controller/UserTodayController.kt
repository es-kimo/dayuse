package com.dayuse.domain.today.controller

import com.dayuse.domain.today.dto.TodayActionResponse
import com.dayuse.domain.today.service.TodayService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/today")
class UserTodayController(
    private val todayService: TodayService
) {

    @GetMapping
    fun getAllTodayActions(
        @CurrentUserId userId: Long
    ): ResponseEntity<List<TodayActionResponse>> {
        val response = todayService.getAllTodayActions(userId)
        return ResponseEntity.ok(response)
    }
}
