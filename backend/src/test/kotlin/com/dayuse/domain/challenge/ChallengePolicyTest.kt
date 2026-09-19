package com.dayuse.domain.challenge

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.time.LocalDate

class ChallengePolicyTest {

    private val baseToday = LocalDate.of(
        2026,
        9,
        20
    )

    @Test
    fun `챌린지 시작일이 오늘보다 미래이면 시작 전(NOT_STARTED) 상태이다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            title = "1일 1커밋",
            verificationCriteria = "GitHub 잔디 인증",
            startDate = baseToday.plusDays(1),
            endDate = baseToday.plusDays(14)
        )

        assertFalse(challenge.isStarted(baseToday))
        assertFalse(challenge.isEnded(baseToday))
        assertEquals(
            ChallengeStatus.NOT_STARTED,
            challenge.status(baseToday)
        )
        assertTrue(challenge.canJoin(baseToday))
        assertTrue(challenge.canCancel(baseToday))
        assertTrue(challenge.canDelete(baseToday))
        assertTrue(challenge.canModifyFullConditions(baseToday))
    }

    @Test
    fun `챌린지 시작일 당일(00시 00분 KST)이 되면 진행 중(IN_PROGRESS) 상태로 전환된다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            title = "매일 아침 7시 기상",
            verificationCriteria = "기상 알람 화면 캡처",
            startDate = baseToday,
            endDate = baseToday.plusDays(13)
        )

        assertTrue(challenge.isStarted(baseToday))
        assertFalse(challenge.isEnded(baseToday))
        assertEquals(
            ChallengeStatus.IN_PROGRESS,
            challenge.status(baseToday)
        )
        assertFalse(challenge.canJoin(baseToday))
        assertFalse(challenge.canCancel(baseToday))
        assertFalse(challenge.canDelete(baseToday))
        assertFalse(challenge.canModifyFullConditions(baseToday))
    }

    @Test
    fun `챌린지 종료일이 지나면 종료(ENDED) 상태가 된다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            title = "러닝 5km",
            verificationCriteria = "런닝앱 기록 캡처",
            startDate = baseToday.minusDays(15),
            endDate = baseToday.minusDays(1)
        )

        assertTrue(challenge.isStarted(baseToday))
        assertTrue(challenge.isEnded(baseToday))
        assertEquals(
            ChallengeStatus.ENDED,
            challenge.status(baseToday)
        )
        assertFalse(challenge.canJoin(baseToday))
        assertFalse(challenge.canCancel(baseToday))
        assertFalse(challenge.canDelete(baseToday))
    }

    @Test
    fun `시작 전에는 제목, 설명, 인증 기준, 시작일, 종료일 모두 수정 가능하다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            title = "원래 제목",
            description = "원래 설명",
            verificationCriteria = "원래 기준",
            startDate = baseToday.plusDays(2),
            endDate = baseToday.plusDays(15)
        )

        challenge.updateConditions(
            newTitle = "변경된 제목",
            newDescription = "변경된 설명",
            newVerificationCriteria = "변경된 기준",
            newStartDate = baseToday.plusDays(3),
            newEndDate = baseToday.plusDays(16),
            today = baseToday
        )

        assertEquals(
            "변경된 제목",
            challenge.title
        )
        assertEquals(
            "변경된 설명",
            challenge.description
        )
        assertEquals(
            "변경된 기준",
            challenge.verificationCriteria
        )
        assertEquals(
            baseToday.plusDays(3),
            challenge.startDate
        )
        assertEquals(
            baseToday.plusDays(16),
            challenge.endDate
        )
    }

    @Test
    fun `시작 후 제목과 설명만 수정하는 요청은 정상 통과한다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            title = "시작된 챌린지",
            description = "이전 설명",
            verificationCriteria = "고정 기준",
            startDate = baseToday.minusDays(1),
            endDate = baseToday.plusDays(12)
        )

        challenge.updateConditions(
            newTitle = "수정된 제목",
            newDescription = "수정된 설명",
            newVerificationCriteria = null,
            newStartDate = null,
            newEndDate = null,
            today = baseToday
        )

        assertEquals(
            "수정된 제목",
            challenge.title
        )
        assertEquals(
            "수정된 설명",
            challenge.description
        )
        assertEquals(
            "고정 기준",
            challenge.verificationCriteria
        )
    }

    @Test
    fun `시작 후 인증 기준, 시작일, 종료일을 변경하려고 하면 BadRequestException이 발생한다`() {
        val challenge = Challenge(
            groupId = 1L,
            creatorUserId = 10L,
            startDate = baseToday,
            verificationCriteria = "기준"
        )

        // 인증 기준 변경 시도
        assertThrows(BadRequestException::class.java) {
            challenge.updateConditions(
                newTitle = "제목",
                newDescription = null,
                newVerificationCriteria = "새로운 기준 시도",
                newStartDate = null,
                newEndDate = null,
                today = baseToday
            )
        }

        // 시작일 변경 시도
        assertThrows(BadRequestException::class.java) {
            challenge.updateConditions(
                newTitle = null,
                newDescription = null,
                newVerificationCriteria = null,
                newStartDate = baseToday.plusDays(1),
                newEndDate = null,
                today = baseToday
            )
        }

        // 종료일 변경 시도
        assertThrows(BadRequestException::class.java) {
            challenge.updateConditions(
                newTitle = null,
                newDescription = null,
                newVerificationCriteria = null,
                newStartDate = null,
                newEndDate = baseToday.plusDays(20),
                today = baseToday
            )
        }

    }
}
