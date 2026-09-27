package com.dayuse.domain.challenge

enum class ExecutionType(val description: String) {
    INDIVIDUAL("각자하기"),
    TOGETHER("함께하기");

    val isTogether: Boolean get() = this == TOGETHER
    val isIndividual: Boolean get() = this == INDIVIDUAL
}
