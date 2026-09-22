@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.dailyrecord

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest
import org.springframework.test.context.ActiveProfiles
import java.time.LocalDate

@DataJpaTest
@ActiveProfiles("test")
class DailyRecordQueryTest {
    @Autowired
    private lateinit var repository: DailyRecordRepository

    @Test
    fun `미확인 조회와 건수는 과거 미완료 상태만 포함하고 다른 사용자와 모임을 제외한다`() {
        val today = LocalDate.of(2026, 9, 23)
        val expectedIds = mutableSetOf<Long>()
        for (status in DailyRecordStatus.entries) {
            for (offset in -1L..1L) {
                val record = repository.save(DailyRecord(
                    groupId = 1L, userId = 1L, challengeParticipantId = status.ordinal + 1L,
                    date = today.plusDays(offset), status = status
                ))
                if (offset == -1L && status in setOf(DailyRecordStatus.PLANNED, DailyRecordStatus.WAITING, DailyRecordStatus.UNCHECKED)) {
                    expectedIds.add(record.id)
                }
            }
        }
        repository.save(DailyRecord(groupId = 2L, userId = 1L, challengeParticipantId = 100L,
            date = today.minusDays(1), status = DailyRecordStatus.PLANNED))
        repository.save(DailyRecord(groupId = 1L, userId = 2L, challengeParticipantId = 101L,
            date = today.minusDays(1), status = DailyRecordStatus.PLANNED))
        repository.flush()
        assertEquals(expectedIds, repository.findUncheckedRecords(1L, 1L, today).map { it.id }.toSet())
        assertEquals(3L, repository.countUncheckedRecords(1L, 1L, today))
    }
}
