@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.verification

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.exception.DuplicateResourceException
import org.hibernate.exception.ConstraintViolationException
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.dao.DataIntegrityViolationException
import java.sql.SQLException
import java.time.LocalDate
import java.util.Optional

class VerificationServiceTest {
    private val verifications = mock(VerificationRepository::class.java)
    private val challenges = mock(ChallengeRepository::class.java)
    private val participants = mock(ChallengeParticipantRepository::class.java)
    private val members = mock(GroupMemberRepository::class.java)
    private val service = VerificationService(verifications, challenges, participants, members)
    private val date = LocalDate.of(2020, 1, 2)
    private val request = CreateVerificationRequest(10L, "https://s3.example.com/test.jpg", targetDate = date)

    @BeforeEach
    fun setUp() {
        `when`(challenges.findById(10L)).thenReturn(Optional.of(
            Challenge(id = 10L, groupId = 1L, startDate = date.minusDays(1), endDate = date.plusDays(1))
        ))
        `when`(members.existsByGroupIdAndUserId(1L, 20L)).thenReturn(true)
        `when`(participants.existsByChallengeIdAndUserId(10L, 20L)).thenReturn(true)
        // 사전 중복 검사를 통과한 뒤 DB 저장 단계에서 충돌하는 경로를 검증한다.
        `when`(verifications.existsByChallengeIdAndUserIdAndTargetDate(10L, 20L, date)).thenReturn(false)
    }

    @Test
    fun `저장 시 하루 인증 제약 위반은 원인 체인을 따라 중복 인증 예외로 변환한다`() {
        val failure = integrityFailure("uk_verification_challenge_user_date")
        doThrow(failure).`when`(verifications).save(any(Verification::class.java))
        val actual = assertThrows(DuplicateResourceException::class.java) {
            service.createVerification(20L, request)
        }
        assertEquals("해당 챌린지는 대상 날짜에 이미 인증을 완료했습니다.", actual.message)
    }

    @Test
    fun `다른 제약조건 위반은 원래 예외를 유지한다`() {
        assertOriginalFailure(integrityFailure("uk_other_constraint"))
    }

    @Test
    fun `제약조건 이름을 알 수 없으면 원래 예외를 유지한다`() {
        assertOriginalFailure(integrityFailure(null))
    }

    @Test
    fun `제약조건 예외가 아닌 데이터 무결성 오류는 원래 예외를 유지한다`() {
        assertOriginalFailure(DataIntegrityViolationException("이미지 URL 길이 초과", SQLException("too long", "22001")))
    }

    private fun integrityFailure(name: String?): DataIntegrityViolationException =
        DataIntegrityViolationException("저장 실패", RuntimeException(
            ConstraintViolationException("제약 위반", SQLException("constraint violation", "23000"), name)
        ))

    private fun assertOriginalFailure(failure: DataIntegrityViolationException) {
        doThrow(failure).`when`(verifications).save(any(Verification::class.java))
        val actual = assertThrows(DataIntegrityViolationException::class.java) {
            service.createVerification(20L, request)
        }
        assertSame(failure, actual)
    }
}
