package com.dayuse.global.jwt

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test

class JwtTokenProviderTest {

    private val secret = "test-jwt-secret-key-must-be-very-long-and-secure-at-least-256-bits-for-hmac-sha!"
    private val tokenProvider = JwtTokenProvider(
        secret = secret,
        accessTokenExpirationMs = 3600000,
        refreshTokenExpirationMs = 1209600000
    )

    @Test
    fun `generate and validate accessToken successfully`() {
        val userId = 42L
        val token = tokenProvider.generateAccessToken(userId)

        assertNotNull(token)
        assertTrue(tokenProvider.validateToken(token))
        assertEquals(userId, tokenProvider.getUserIdFromToken(token))
    }

    @Test
    fun `generate and validate refreshToken successfully`() {
        val userId = 100L
        val token = tokenProvider.generateRefreshToken(userId)

        assertNotNull(token)
        assertTrue(tokenProvider.validateToken(token))
        assertEquals(userId, tokenProvider.getUserIdFromToken(token))
    }

    @Test
    fun `validateToken returns false for invalid token`() {
        val invalidToken = "invalid.token.string"
        assertFalse(tokenProvider.validateToken(invalidToken))
    }

    @Test
    fun `validateToken returns false for expired token`() {
        val expiredTokenProvider = JwtTokenProvider(
            secret = secret,
            accessTokenExpirationMs = -1000, // already expired
            refreshTokenExpirationMs = -1000
        )
        val token = expiredTokenProvider.generateAccessToken(1L)
        assertFalse(tokenProvider.validateToken(token))
    }
}
