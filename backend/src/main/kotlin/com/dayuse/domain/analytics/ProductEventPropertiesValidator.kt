package com.dayuse.domain.analytics

import com.dayuse.domain.experiment.Experiment
import com.dayuse.domain.experiment.ExperimentVariant
import com.dayuse.global.exception.BadRequestException

/**
 * ProductEvent의 `properties`에 포함된 Experiment Context(`experimentKey`, `variant`). (v0.10 F06)
 *
 * 중첩 구조(`properties.experiment = { experimentKey, variant }`)와
 * 최상위 평탄 구조(`properties.experimentKey`, `properties.variant`)를 모두 지원한다.
 */
data class ExperimentEventContext(
    val experimentKey: String,
    val variant: ExperimentVariant
) {
    fun toPropertyMap(): Map<String, String> = mapOf(
        KEY_EXPERIMENT_KEY to experimentKey,
        KEY_VARIANT to variant.name
    )

    companion object {
        const val KEY_EXPERIMENT = "experiment"
        const val KEY_EXPERIMENT_KEY = "experimentKey"
        const val KEY_VARIANT = "variant"

        private val EVENT_EXPERIMENT_KEY_REGEX = Regex("^[a-z][a-z0-9_-]{1,62}[a-z0-9]$")

        fun validateExperimentKey(rawKey: String): String {
            val trimmed = rawKey.trim()
            if (trimmed.length !in Experiment.MIN_KEY_LENGTH..Experiment.MAX_KEY_LENGTH ||
                !EVENT_EXPERIMENT_KEY_REGEX.matches(trimmed)
            ) {
                throw BadRequestException("유효하지 않은 experimentKey 형식입니다: '$rawKey'")
            }
            return trimmed
        }

        fun extractFrom(properties: Map<String, Any?>): ExperimentEventContext? {
            val nested = properties[KEY_EXPERIMENT]
            val nestedContext = if (nested is Map<*, *>) {
                val rawKey = nested[KEY_EXPERIMENT_KEY] as? String
                val rawVariant = nested[KEY_VARIANT] as? String
                if (rawKey != null && rawVariant != null) {
                    parseOrNull(rawKey, rawVariant)
                } else {
                    null
                }
            } else {
                null
            }

            val flatKey = properties[KEY_EXPERIMENT_KEY] as? String
            val flatVariant = properties[KEY_VARIANT] as? String
            val flatContext = if (flatKey != null && flatVariant != null) {
                parseOrNull(flatKey, flatVariant)
            } else {
                null
            }

            return nestedContext ?: flatContext
        }

        private fun parseOrNull(rawKey: String, rawVariant: String): ExperimentEventContext? {
            return try {
                val key = validateExperimentKey(rawKey)
                val variant = ExperimentVariant.from(rawVariant)
                ExperimentEventContext(
                    experimentKey = key,
                    variant = variant
                )
            } catch (_: BadRequestException) {
                null
            }
        }
    }
}

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

            when (key) {
                ExperimentEventContext.KEY_EXPERIMENT -> {
                    if (value != null) {
                        sanitized[key] = validateAndSanitizeExperimentMap(value)
                    }
                }

                ExperimentEventContext.KEY_EXPERIMENT_KEY -> {
                    if (value !is String) {
                        throw BadRequestException("experimentKey는 문자열이어야 합니다.")
                    }
                    sanitized[key] = ExperimentEventContext.validateExperimentKey(value)
                }

                ExperimentEventContext.KEY_VARIANT -> {
                    if (value !is String) {
                        throw BadRequestException("variant는 문자열('A' 또는 'B')이어야 합니다.")
                    }
                    sanitized[key] = ExperimentVariant.from(value).name
                }

                else -> {
                    validateValue(key, value)
                    sanitized[key] = value
                }
            }
        }

        // 최상위 experimentKey/variant가 한쪽만 있거나 중첩 experiment와 충돌하는 경우 방어
        val hasFlatKey = sanitized.containsKey(ExperimentEventContext.KEY_EXPERIMENT_KEY)
        val hasFlatVariant = sanitized.containsKey(ExperimentEventContext.KEY_VARIANT)
        if (hasFlatKey != hasFlatVariant) {
            throw BadRequestException("properties에 experimentKey와 variant는 함께 전달되어야 합니다.")
        }

        val nestedMap = sanitized[ExperimentEventContext.KEY_EXPERIMENT] as? Map<*, *>
        if (nestedMap != null && hasFlatKey) {
            val flatKey = sanitized[ExperimentEventContext.KEY_EXPERIMENT_KEY]
            val flatVariant = sanitized[ExperimentEventContext.KEY_VARIANT]
            if (nestedMap[ExperimentEventContext.KEY_EXPERIMENT_KEY] != flatKey ||
                nestedMap[ExperimentEventContext.KEY_VARIANT] != flatVariant
            ) {
                throw BadRequestException("최상위 experimentKey/variant와 중첩 experiment 컨텍스트가 일치하지 않습니다.")
            }
        }

        return sanitized.toMap()
    }

    private fun validateAndSanitizeExperimentMap(raw: Any): Map<String, String> {
        val map = raw as? Map<*, *>
            ?: throw BadRequestException("properties.experiment는 { experimentKey, variant } 객체여야 합니다.")

        val allowedKeys = setOf(
            ExperimentEventContext.KEY_EXPERIMENT_KEY,
            ExperimentEventContext.KEY_VARIANT
        )
        val extraKeys = map.keys.map { it?.toString()?.trim().orEmpty() }.filter { it !in allowedKeys }
        if (extraKeys.isNotEmpty()) {
            throw BadRequestException("properties.experiment에는 experimentKey와 variant만 포함할 수 있습니다: $extraKeys")
        }

        val rawExperimentKey = map[ExperimentEventContext.KEY_EXPERIMENT_KEY] as? String
            ?: throw BadRequestException("properties.experiment.experimentKey는 필수 문자열입니다.")
        val rawVariant = map[ExperimentEventContext.KEY_VARIANT] as? String
            ?: throw BadRequestException("properties.experiment.variant는 필수 문자열('A' 또는 'B')입니다.")

        val validatedKey = ExperimentEventContext.validateExperimentKey(rawExperimentKey)
        val validatedVariant = ExperimentVariant.from(rawVariant)

        return mapOf(
            ExperimentEventContext.KEY_EXPERIMENT_KEY to validatedKey,
            ExperimentEventContext.KEY_VARIANT to validatedVariant.name
        )
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
