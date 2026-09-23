package com.dayuse.domain.challenge

import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ChallengeAlreadyStartedException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDate

class ChallengeParticipantTest {

    private val baseToday = LocalDate.of(2026, 9, 22)

    @Test
    fun `참여자의 시작일 전에는 isStarted가 false이고 취소 및 금액 수정이 가능하다`() {
        val participant = ChallengeParticipant(
            challengeId = 1L,
            userId = 10L,
            penaltyAmount = 5000,
            startDate = baseToday.plusDays(1), // 내일부터 시작
            status = ParticipantStatus.ACTIVE
        )

        assertFalse(participant.isStarted(baseToday))
        assertTrue(participant.canCancel(baseToday))
        assertTrue(participant.canModifyPenalty(baseToday))
    }

    @Test
    fun `참여자의 시작일 당일 및 이후에는 isStarted가 true이고 취소 및 금액 수정이 불가하다`() {
        val participant = ChallengeParticipant(
            challengeId = 1L,
            userId = 10L,
            penaltyAmount = 5000,
            startDate = baseToday, // 오늘부터 시작
            status = ParticipantStatus.ACTIVE
        )

        assertTrue(participant.isStarted(baseToday))
        assertFalse(participant.canCancel(baseToday))
        assertFalse(participant.canModifyPenalty(baseToday))

        // 취소 시도 시 예외 발생
        assertThrows<ChallengeAlreadyStartedException> {
            participant.cancel(baseToday)
        }

        // 금액 수정 시도 시 예외 발생
        assertThrows<ChallengeAlreadyStartedException> {
            participant.updatePenalty(10000, baseToday)
        }
    }

    @Test
    fun `시작일 전에는 정상적으로 참여를 취소할 수 있고 CANCELLED 상태가 된다`() {
        val participant = ChallengeParticipant(
            challengeId = 1L,
            userId = 10L,
            penaltyAmount = 5000,
            startDate = baseToday.plusDays(1),
            status = ParticipantStatus.ACTIVE
        )

        participant.cancel(baseToday)

        assertEquals(ParticipantStatus.CANCELLED, participant.status)
        assertFalse(participant.canCancel(baseToday))
        assertFalse(participant.canModifyPenalty(baseToday))
    }

    @Test
    fun `시작일 전에는 약정 금액을 정상적으로 수정할 수 있다`() {
        val participant = ChallengeParticipant(
            challengeId = 1L,
            userId = 10L,
            penaltyAmount = 5000,
            startDate = baseToday.plusDays(1),
            status = ParticipantStatus.ACTIVE
        )

        participant.updatePenalty(10000, baseToday)
        assertEquals(10000, participant.penaltyAmount)

        // 음수 금액 시 예외 발생
        assertThrows<BadRequestException> {
            participant.updatePenalty(-1000, baseToday)
        }
    }

    @Test
    fun `취소된 참여자는 reactivate를 통해 새로운 시작일과 금액으로 다시 활성화된다`() {
        val participant = ChallengeParticipant(
            challengeId = 1L,
            userId = 10L,
            penaltyAmount = 5000,
            startDate = baseToday.plusDays(1),
            status = ParticipantStatus.CANCELLED
        )

        participant.reactivate(newStartDate = baseToday.plusDays(2), newPenalty = 7000)

        assertEquals(ParticipantStatus.ACTIVE, participant.status)
        assertEquals(baseToday.plusDays(2), participant.startDate)
        assertEquals(7000, participant.penaltyAmount)
    }
}
