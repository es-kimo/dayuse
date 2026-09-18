package com.dayuse.global.exception

import org.springframework.http.HttpStatus

open class DayuseException(
    val status: HttpStatus,
    override val message: String
) : RuntimeException(message)

class ResourceNotFoundException(message: String) : DayuseException(HttpStatus.NOT_FOUND, message)

class ForbiddenException(message: String) : DayuseException(HttpStatus.FORBIDDEN, message)

class BadRequestException(message: String) : DayuseException(HttpStatus.BAD_REQUEST, message)

class ChallengeAlreadyStartedException(message: String = "이미 시작된 챌린지는 참여, 취소, 또는 삭제할 수 없습니다.") :
    DayuseException(HttpStatus.BAD_REQUEST, message)

class DuplicateResourceException(message: String) : DayuseException(HttpStatus.CONFLICT, message)
