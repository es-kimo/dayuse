package com.dayuse.domain.feed.controller

import com.dayuse.domain.feed.dto.FeedPageResponse
import com.dayuse.domain.feed.service.FeedService
import com.dayuse.global.security.CurrentUserId
import org.springframework.data.domain.Pageable
import org.springframework.data.domain.Sort
import org.springframework.data.web.PageableDefault
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups/{groupId}/feed")
class FeedController(
    private val feedService: FeedService
) {

    @GetMapping
    fun getGroupFeed(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long,
        @PageableDefault(size = 10, sort = ["createdAt"], direction = Sort.Direction.DESC) pageable: Pageable
    ): ResponseEntity<FeedPageResponse> {
        val response = feedService.getGroupFeed(groupId, userId, pageable)
        return ResponseEntity.ok(response)
    }
}
