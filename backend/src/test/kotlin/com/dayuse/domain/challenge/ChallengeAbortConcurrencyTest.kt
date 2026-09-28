@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.AbortChallengeRequest
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.service.VerificationService
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

@SpringBootTest
@ActiveProfiles("test")
class ChallengeAbortConcurrencyTest {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var dailyRecordRepository: DailyRecordRepository

    @Autowired
    private lateinit var verificationRepository: VerificationRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    @Autowired
    private lateinit var verificationService: VerificationService

    private lateinit var creator: User
    private lateinit var participant: User
    private lateinit var group: Group
    private lateinit var challenge: Challenge

    @BeforeEach
    fun setUp() {
        val today = DateTimeUtils.todayKst()

        creator = userRepository.save(User(kakaoId = "c_concurrency", nickname = "생성자"))
        participant = userRepository.save(User(kakaoId = "p_concurrency", nickname = "참가자"))

        group = groupRepository.save(Group(name = "동시성 테스트 모임", hostUserId = creator.id, inviteCode = "ABORT_CONCUR_1"))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = creator.id, role = GroupRole.HOST))
        groupMemberRepository.save(GroupMember(groupId = group.id, userId = participant.id, role = GroupRole.MEMBER))

        challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = creator.id,
                title = "동시성 테스트 챌린지",
                verificationCriteria = "인증 기준",
                startDate = today.minusDays(1),
                endDate = today.plusDays(5),
                periodType = PeriodType.DAILY
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = creator.id, startDate = today.minusDays(1))
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = participant.id, startDate = today.minusDays(1))
        )
    }

    @AfterEach
    fun tearDown() {
        verificationRepository.deleteAll()
        dailyRecordRepository.deleteAll()
        challengeParticipantRepository.deleteAll()
        challengeRepository.deleteAll()
        groupMemberRepository.deleteAll()
        groupRepository.deleteAll()
        userRepository.deleteAll()
    }

    @Test
    fun `중단 요청과 인증 등록이 동시에 발생해도 트랜잭션 선착순에 따라 일관된 상태가 보장된다`() {
        val executor = Executors.newFixedThreadPool(2)
        val startLatch = CountDownLatch(1)
        val doneLatch = CountDownLatch(2)

        val abortSuccess = AtomicBoolean(false)
        val verifySuccess = AtomicBoolean(false)
        val verifyRejected = AtomicBoolean(false)

        val abortError = java.util.concurrent.atomic.AtomicReference<Throwable?>(null)
        val verifyError = java.util.concurrent.atomic.AtomicReference<Throwable?>(null)

        // 스레드 1: 중단 요청
        executor.submit {
            try {
                startLatch.await()
                challengeService.abortChallenge(
                    challengeId = challenge.id,
                    userId = creator.id,
                    request = AbortChallengeRequest(reason = "동시성 테스트 중단")
                )
                abortSuccess.set(true)
            } catch (e: Throwable) {
                abortError.set(e)
            } finally {
                doneLatch.countDown()
            }
        }

        // 스레드 2: 인증 등록 요청
        executor.submit {
            try {
                startLatch.await()
                verificationService.createVerification(
                    userId = participant.id,
                    request = CreateVerificationRequest(
                        challengeId = challenge.id,
                        imageUrl = "https://dayuse.s3.ap-northeast-2.amazonaws.com/verifications/1/1/test.jpg"
                    )
                )
                verifySuccess.set(true)
            } catch (e: BadRequestException) {
                if (e.message?.contains("중단된 챌린지") == true) {
                    verifyRejected.set(true)
                } else {
                    verifyError.set(e)
                }
            } catch (e: Throwable) {
                verifyError.set(e)
            } finally {
                doneLatch.countDown()
            }
        }

        startLatch.countDown()
        assertTrue(doneLatch.await(5, TimeUnit.SECONDS))
        executor.shutdown()

        // 검증:
        // 1. 중단은 무조건 성공해야 함
        assertTrue(abortSuccess.get())

        // 2. 인증 등록은:
        // - 중단보다 먼저 커밋된 경우: verifySuccess == true
        // - 중단보다 늦게 커밋된 경우: verifyRejected == true (BadRequestException)
        assertTrue(verifySuccess.get() || verifyRejected.get())

        val latestChallenge = challengeRepository.findById(challenge.id).get()
        assertEquals(ChallengeStatus.ABORTED, latestChallenge.status(DateTimeUtils.todayKst()))
    }
}
