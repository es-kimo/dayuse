package com.dayuse.global.infra.s3

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1/mock-s3")
class MockS3Controller {

    @PutMapping("/**")
    fun mockUpload(): ResponseEntity<Void> {
        return ResponseEntity.ok().build()
    }
}
