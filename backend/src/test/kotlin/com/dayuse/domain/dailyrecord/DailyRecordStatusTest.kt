@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.dailyrecord

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import java.time.LocalDate

class DailyRecordStatusTest {
    private val today = LocalDate.of(2026, 9, 23)

    @ParameterizedTest
    @EnumSource(value = DailyRecordStatus::class, names = ["PLANNED", "WAITING", "UNCHECKED", "FAILED"])
    fun `과거 미완료 기록은 늦은 인증으로 완료되고 벌금이 해제된다`(storedStatus: DailyRecordStatus) {
        val record = DailyRecord(date = today.minusDays(1), status = storedStatus, penaltyAmount = 5000)
        record.verifyLate(42L, isLate = false, today = today)
        assertEquals(DailyRecordStatus.COMPLETED, record.status)
        assertEquals(42L, record.verificationId)
        assertEquals(0, record.penaltyAmount)
        assertFalse(record.isLate)
    }

    @ParameterizedTest
    @EnumSource(DailyRecordStatus::class)
    fun `오늘과 미래 기록은 저장 상태와 관계없이 늦은 인증을 거절하고 변경하지 않는다`(storedStatus: DailyRecordStatus) {
        for (date in listOf(today, today.plusDays(1))) {
            val record = DailyRecord(date = date, status = storedStatus, penaltyAmount = 5000)
            assertThrows(BadRequestException::class.java) { record.verifyLate(42L, today = today) }
            assertEquals(storedStatus, record.status)
            assertNull(record.verificationId)
            assertEquals(5000, record.penaltyAmount)
        }
    }

    @ParameterizedTest
    @EnumSource(value = DepositStatus::class, names = ["WAITING_CONFIRMATION", "CONFIRMED"])
    fun `정산 잠금 기록은 늦은 인증 실패 후에도 저장 상태가 유지된다`(lock: DepositStatus) {
        for (storedStatus in DailyRecordStatus.entries) {
            val record = DailyRecord(date = today.minusDays(1), status = storedStatus, depositStatus = lock)
            assertThrows(BadRequestException::class.java) { record.verifyLate(42L, today = today) }
            assertEquals(storedStatus, record.status)
            assertNull(record.verificationId)
        }
    }
    @ParameterizedTest
    @EnumSource(value = DailyRecordStatus::class, names = ["PLANNED", "WAITING", "UNCHECKED"])
    fun `과거 미확인 기록은 저장 상태와 관계없이 미수행 확정된다`(storedStatus: DailyRecordStatus) {
        val record = DailyRecord(date = today.minusDays(1), status = storedStatus)
        record.markFailed(5000, today)
        assertEquals(DailyRecordStatus.FAILED, record.status)
        assertEquals(5000, record.penaltyAmount)
        assertNotNull(record.failedAt)
    }

    @ParameterizedTest
    @EnumSource(DailyRecordStatus::class)
    fun `오늘과 미래 기록은 미수행 확정할 수 없다`(storedStatus: DailyRecordStatus) {
        for (date in listOf(today, today.plusDays(1))) {
            val record = DailyRecord(date = date, status = storedStatus)
            assertThrows(BadRequestException::class.java) { record.markFailed(5000, today) }
            assertEquals(storedStatus, record.status)
            assertEquals(0, record.penaltyAmount)
        }
    }

    @ParameterizedTest
    @EnumSource(value = DailyRecordStatus::class, names = ["COMPLETED", "FAILED"])
    fun `과거 확정 상태를 다시 미수행 처리할 수 없다`(storedStatus: DailyRecordStatus) {
        val record = DailyRecord(date = today.minusDays(1), status = storedStatus)
        assertThrows(BadRequestException::class.java) { record.markFailed(5000, today) }
        assertEquals(storedStatus, record.status)
        if (storedStatus == DailyRecordStatus.COMPLETED) {
            assertThrows(BadRequestException::class.java) { record.verifyLate(42L, today = today) }
            assertEquals(storedStatus, record.status)
        }
    }

}
