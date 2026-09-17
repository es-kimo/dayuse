package com.dayuse.domain.group.controller

import com.dayuse.domain.group.dto.CreateGroupRequest
import com.dayuse.domain.group.dto.GroupDetailResponse
import com.dayuse.domain.group.dto.GroupSummaryResponse
import com.dayuse.domain.group.dto.InviteCodeResponse
import com.dayuse.domain.group.service.GroupService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/groups")
class GroupController(
    private val groupService: GroupService
) {

    @PostMapping
    fun createGroup(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: CreateGroupRequest
    ): ResponseEntity<GroupDetailResponse> {
        val response = groupService.createGroup(userId, request)
        return ResponseEntity.status(HttpStatus.CREATED).body(response)
    }

    @GetMapping
    fun getMyGroups(
        @CurrentUserId userId: Long
    ): ResponseEntity<List<GroupSummaryResponse>> {
        val response = groupService.getMyGroups(userId)
        return ResponseEntity.ok(response)
    }

    @GetMapping("/{groupId}")
    fun getGroupDetail(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<GroupDetailResponse> {
        val response = groupService.getGroupDetail(groupId, userId)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/{groupId}/invite-code/refresh")
    fun refreshInviteCode(
        @PathVariable groupId: Long,
        @CurrentUserId userId: Long
    ): ResponseEntity<InviteCodeResponse> {
        val response = groupService.refreshInviteCode(groupId, userId)
        return ResponseEntity.ok(response)
    }
}
