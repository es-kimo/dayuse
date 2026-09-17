package com.dayuse.domain.auth.controller

import com.dayuse.domain.auth.dto.KakaoLoginRequest
import com.dayuse.domain.auth.dto.RefreshTokenRequest
import com.dayuse.domain.auth.dto.TokenResponse
import com.dayuse.domain.auth.service.AuthResult
import com.dayuse.domain.auth.service.AuthService
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/auth")
class AuthController(
    private val authService: AuthService
) {

    @PostMapping("/kakao")
    fun loginWithKakao(@Valid @RequestBody request: KakaoLoginRequest): ResponseEntity<AuthResult> {
        val result = authService.loginWithKakao(request)
        return ResponseEntity.ok(result)
    }

    @PostMapping("/refresh")
    fun refreshToken(@Valid @RequestBody request: RefreshTokenRequest): ResponseEntity<TokenResponse> {
        val result = authService.refreshToken(request)
        return ResponseEntity.ok(result)
    }
}
