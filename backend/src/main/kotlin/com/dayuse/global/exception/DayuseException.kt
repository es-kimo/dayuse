package com.dayuse.global.exception

import org.springframework.http.HttpStatus

open class DayuseException(
    val status: HttpStatus,
    override val message: String
) : RuntimeException(message)

class ResourceNotFoundException(message: String) : DayuseException(HttpStatus.NOT_FOUND, message)

class ForbiddenException(message: String) : DayuseException(HttpStatus.FORBIDDEN, message)

class BadRequestException(message: String) : DayuseException(HttpStatus.BAD_REQUEST, message)

class DuplicateResourceException(message: String) : DayuseException(HttpStatus.CONFLICT, message)
