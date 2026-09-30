package com.dayuse.domain.analytics

import com.dayuse.global.exception.BadRequestException

object ProductEventPropertiesValidator {

    private val FORBIDDEN_NORMALIZED_KEYS: Set<String> = setOf(
        // 인증 사진 및 이미지/미디어 URL
        "image",
        "imageurl",
        "photo",
        "photourl",
        "s3key",
        "fileurl",
        "mediaurl",
        "thumbnailurl",
        // 인증 문구, 댓글 내용, 자유 입력 원문
        "content",
        "comment",
        "commentcontent",
        "message",
        "memo",
        "text",
        "description",
        "body",
        "note",
        // 이름·닉네임 등 표시 문자열 및 개인식별정보
        "name",
        "nickname",
        "username",
        "displayname",
        "email",
        "phone",
        "phonenumber",
        "profileimage",
        // 계좌번호·예금주·입금자명 등 금융/정산 민감정보
        "accountnumber",
        "accountholder",
        "depositor",
        "depositorname",
        "bankname",
        "bankaccount",
        // 인증/세션 토큰 및 보안 정보
        "token",
        "accesstoken",
        "refreshtoken",
        "idtoken",
        "authorization",
        "password",
        "secret",
        // 클라이언트 userId 오염 방지 (userId는 서버 인증 정보로만 기록)
        "userid"
    )

    private val FORBIDDEN_VALUE_PREFIXES: List<String> = listOf(
        "http://",
        "https://",
        "s3://",
        "data:image/"
    )

    private const val MAX_STRING_PROPERTY_LENGTH = 100

    fun validateAndSanitize(properties: Map<String, Any?>): Map<String, Any?> {
        if (properties.isEmpty()) {
            return emptyMap()
        }

        val sanitized = LinkedHashMap<String, Any?>()
        for ((rawKey, value) in properties) {
            val key = rawKey.trim()
            if (key.isEmpty()) {
                throw BadRequestException("properties 키는 비어 있을 수 없습니다.")
            }

            val normalizedKey = normalizeKey(key)
            if (normalizedKey in FORBIDDEN_NORMALIZED_KEYS) {
                throw BadRequestException("properties에 허용되지 않는 민감정보 또는 콘텐츠 키가 포함되어 있습니다: $key")
            }

            validateValue(
                key,
                value
            )
            sanitized[key] = value
        }

        return sanitized.toMap()
    }

    private fun normalizeKey(key: String): String {
        return key.lowercase().replace(
            "_",
            ""
        ).replace(
            "-",
            ""
        )
    }

    private fun validateValue(
        key: String,
        value: Any?
    ) {
        when (value) {
            null, is Number, is Boolean -> return
            is String -> {
                val trimmed = value.trim().lowercase()
                if (FORBIDDEN_VALUE_PREFIXES.any { trimmed.startsWith(it) }) {
                    throw BadRequestException("properties 값에 외부 URL 또는 이미지 경로를 포함할 수 없습니다: $key")
                }
                if (value.length > MAX_STRING_PROPERTY_LENGTH) {
                    throw BadRequestException("properties 문자열 값 길이가 허용 범위(${MAX_STRING_PROPERTY_LENGTH}자)를 초과했습니다: $key")
                }
            }

            else -> throw BadRequestException("properties 값에는 원시 타입(String, Number, Boolean)만 허용됩니다: $key")
        }
    }
}
