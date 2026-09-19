package com.dayuse.global.security

import org.springframework.security.core.annotation.AuthenticationPrincipal

@Target(AnnotationTarget.VALUE_PARAMETER)
@Retention(AnnotationRetention.RUNTIME)
// JWT 인증 필터가 설정한 UserPrincipal.id를 런타임에 평가합니다.
@Suppress("SpringElInspection")
@AuthenticationPrincipal(expression = "id")
annotation class CurrentUserId
