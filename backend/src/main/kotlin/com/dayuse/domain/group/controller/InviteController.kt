package com.dayuse.domain.group.controller

import com.dayuse.domain.group.dto.InviteInfoResponse
import com.dayuse.domain.group.dto.JoinGroupResponse
import com.dayuse.domain.group.service.InviteService
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/invites")
class InviteController(
    private val inviteService: InviteService
) {

    @GetMapping("/{inviteCode}")
    fun getInviteInfo(
        @PathVariable inviteCode: String
    ): ResponseEntity<InviteInfoResponse> {
        val response = inviteService.getInviteInfo(inviteCode)
        return ResponseEntity.ok(response)
    }

    @PostMapping("/{inviteCode}/join")
    fun joinGroup(
        @PathVariable inviteCode: String,
        @CurrentUserId userId: Long
    ): ResponseEntity<JoinGroupResponse> {
        val response = inviteService.joinGroupByInviteCode(inviteCode, userId)
        return ResponseEntity.ok(response)
    }
}
