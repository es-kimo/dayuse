package com.dayuse.domain.settlement

enum class DepositAuditAction {
    REPORTED,
    CANCELLED_BY_USER,
    CONFIRMED_BY_HOST,
    REJECTED_BY_HOST,
    CONFIRMATION_CANCELLED_BY_HOST
}
