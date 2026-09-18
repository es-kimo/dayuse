package com.dayuse.domain.user.controller

import com.dayuse.domain.user.dto.UpdateNicknameRequest
import com.dayuse.domain.user.dto.UserResponse
import com.dayuse.domain.user.service.UserService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/users")
class UserController(
    private val userService: UserService
) {

    @GetMapping("/me")
    fun getMe(@CurrentUserId userId: Long): ResponseEntity<UserResponse> {
        val response = userService.getMe(userId)
        return ResponseEntity.ok(response)
    }

    @PatchMapping("/me")
    fun updateNickname(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: UpdateNicknameRequest
    ): ResponseEntity<UserResponse> {
        val response = userService.updateNickname(userId, request.nickname)
        return ResponseEntity.ok(response)
    }
}
