package com.dayuse.domain.analytics

import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import jakarta.persistence.AttributeConverter
import jakarta.persistence.Converter

@Converter
class ProductEventPropertiesConverter : AttributeConverter<Map<String, Any?>, String> {

    companion object {
        private val objectMapper = jacksonObjectMapper()
        private val mapTypeRef = object : TypeReference<Map<String, Any?>>() {}
    }

    override fun convertToDatabaseColumn(attribute: Map<String, Any?>?): String {
        if (attribute.isNullOrEmpty()) {
            return "{}"
        }
        return objectMapper.writeValueAsString(attribute)
    }

    override fun convertToEntityAttribute(dbData: String?): Map<String, Any?> {
        if (dbData.isNullOrBlank()) {
            return emptyMap()
        }
        return objectMapper.readValue(dbData, mapTypeRef)
    }
}
