package com.dayuse.domain.analytics.controller

import com.dayuse.domain.analytics.dto.ProductEventCreateRequest
import com.dayuse.domain.analytics.dto.ProductEventRecordResponse
import com.dayuse.domain.analytics.service.ProductEventService
import com.dayuse.global.security.CurrentUserId
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/events", "/api/events")
class ProductEventController(
    private val productEventService: ProductEventService
) {

    @PostMapping
    fun recordEvent(
        @CurrentUserId userId: Long,
        @Valid @RequestBody request: ProductEventCreateRequest
    ): ResponseEntity<ProductEventRecordResponse> {
        val response = productEventService.recordEvent(
            authenticatedUserId = userId,
            request = request
        )
        val httpStatus = if (response.duplicated) HttpStatus.OK else HttpStatus.CREATED
        return ResponseEntity.status(httpStatus).body(response)
    }
}
