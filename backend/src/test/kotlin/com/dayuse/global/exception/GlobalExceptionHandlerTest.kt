package com.dayuse.global.exception

import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.security.access.AccessDeniedException
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

@DisplayName("GlobalExceptionHandler 예외 처리 및 공통 ErrorResponse 규격 검증")
class GlobalExceptionHandlerTest {

    private val handler = GlobalExceptionHandler()

    @Test
    @DisplayName("BadRequestException 발생 시 400 Bad Request와 ErrorResponse 규격을 반환한다")
    fun handleBadRequestException() {
        val ex = BadRequestException("잘못된 요청 파라미터입니다.")
        val response = handler.handleDayuseException(ex)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(400, body.status)
        assertEquals("BAD_REQUEST", body.error)
        assertEquals("잘못된 요청 파라미터입니다.", body.message)
        assertNotNull(body.timestamp)
    }

    @Test
    @DisplayName("ForbiddenException 발생 시 403 Forbidden과 ErrorResponse 규격을 반환한다")
    fun handleForbiddenException() {
        val ex = ForbiddenException("해당 모임의 멤버만 접근할 수 있습니다.")
        val response = handler.handleDayuseException(ex)

        assertEquals(HttpStatus.FORBIDDEN, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(403, body.status)
        assertEquals("FORBIDDEN", body.error)
        assertEquals("해당 모임의 멤버만 접근할 수 있습니다.", body.message)
        assertNotNull(body.timestamp)
    }

    @Test
    @DisplayName("ResourceNotFoundException 발생 시 404 Not Found와 ErrorResponse 규격을 반환한다")
    fun handleNotFoundException() {
        val ex = ResourceNotFoundException("요청한 리소스를 찾을 수 없습니다.")
        val response = handler.handleDayuseException(ex)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(404, body.status)
        assertEquals("NOT_FOUND", body.error)
        assertEquals("요청한 리소스를 찾을 수 없습니다.", body.message)
        assertNotNull(body.timestamp)
    }

    @Test
    @DisplayName("DuplicateResourceException 발생 시 409 Conflict와 ErrorResponse 규격을 반환한다")
    fun handleDuplicateResourceException() {
        val ex = DuplicateResourceException("이미 참여 중인 챌린지입니다.")
        val response = handler.handleDayuseException(ex)

        assertEquals(HttpStatus.CONFLICT, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(409, body.status)
        assertEquals("CONFLICT", body.error)
        assertEquals("이미 참여 중인 챌린지입니다.", body.message)
        assertNotNull(body.timestamp)
    }

    @Test
    @DisplayName("AccessDeniedException 발생 시 403 Forbidden을 반환한다")
    fun handleAccessDeniedException() {
        val ex = AccessDeniedException("접근 권한이 없습니다.")
        val response = handler.handleAccessDeniedException(ex)

        assertEquals(HttpStatus.FORBIDDEN, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(403, body.status)
        assertEquals("FORBIDDEN", body.error)
        assertEquals("접근 권한이 없습니다.", body.message)
    }

    @Test
    @DisplayName("DataIntegrityViolationException 발생 시 409 Conflict를 반환한다")
    fun handleDataIntegrityViolationException() {
        val ex = DataIntegrityViolationException("Unique index violation")
        val response = handler.handleDataIntegrityViolationException(ex)

        assertEquals(HttpStatus.CONFLICT, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(409, body.status)
        assertEquals("CONFLICT", body.error)
        assertEquals("데이터 무결성 제약조건 위반 또는 이미 등록된 데이터입니다.", body.message)
    }

    @Test
    @DisplayName("처리되지 않은 일반 Exception 발생 시 500 Internal Server Error를 반환한다")
    fun handleGenericException() {
        val ex = RuntimeException("예기치 않은 시스템 오류")
        val response = handler.handleGenericException(ex)

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.statusCode)
        val body = response.body
        assertNotNull(body)
        assertEquals(500, body.status)
        assertEquals("INTERNAL_SERVER_ERROR", body.error)
        assertEquals("예기치 않은 시스템 오류", body.message)
    }
}
