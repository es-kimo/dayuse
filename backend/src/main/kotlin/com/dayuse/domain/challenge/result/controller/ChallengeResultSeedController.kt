package com.dayuse.domain.challenge.result.controller

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.result.ChallengeParticipantResult
import com.dayuse.domain.challenge.result.ChallengeParticipantResultRepository
import com.dayuse.domain.challenge.result.ChallengeResult
import com.dayuse.domain.challenge.result.ChallengeResultRepository
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.domain.coin.CoinTransaction
import com.dayuse.domain.coin.CoinTransactionRepository
import com.dayuse.domain.coin.CoinTransactionStatus
import com.dayuse.domain.coin.CoinTransactionType
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.ResponseEntity
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDate
import java.time.LocalDateTime
import java.util.UUID

data class SeedEndedChallengesResponse(
    val message: String,
    val createdCount: Int,
    val challengeTitles: List<String>
)

@RestController
@RequestMapping("/api/v1/challenges")
class ChallengeResultSeedController(
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val challengeResultRepository: ChallengeResultRepository,
    private val challengeParticipantResultRepository: ChallengeParticipantResultRepository,
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val verificationRepository: VerificationRepository,
    private val coinTransactionRepository: CoinTransactionRepository? = null
) {

    /**
     * 로컬 개발/테스트용 종료 챌린지 샘플 데이터 생성 API
     * (완주 성공, 일부 실천, 중단, 잠정 결과 4가지 케이스 즉시 주입)
     */
    @PostMapping("/seed-ended-samples")
    @Transactional
    fun seedEndedChallenges(
        @CurrentUserId userId: Long
    ): ResponseEntity<SeedEndedChallengesResponse> {
        val today = LocalDate.now()

        // 1. 사용자가 속한 모임 조회 또는 생성
        val memberGroups = groupMemberRepository.findAllByUserId(userId)
        val group = if (memberGroups.isNotEmpty()) {
            groupRepository.findById(memberGroups.first().groupId).orElseGet {
                createDefaultGroup(userId)
            }
        } else {
            createDefaultGroup(userId)
        }

        val titles = mutableListOf<String>()

        // 2-1. [완주 성공] 7일 아침 러닝 (확정, 성공, 7코인 적립)
        val c1 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userId,
                title = "🏃 아침 러닝 7일 챌린지 (완주 성공 샘플)",
                verificationCriteria = "러닝 앱 기록 캡처",
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY,
                startDate = today.minusDays(8),
                endDate = today.minusDays(2)
            )
        )
        val p1 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = c1.id,
                userId = userId,
                startDate = c1.startDate,
                penaltyAmount = 1000
            )
        )
        val r1 = challengeResultRepository.save(
            ChallengeResult(
                challengeId = c1.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = c1.startDate,
                endDate = c1.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                confirmedAt = LocalDateTime.now().minusDays(1),
                revision = 1
            )
        )
        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = r1.id,
                challengeId = c1.id,
                challengeParticipantId = p1.id,
                userId = userId,
                groupId = group.id,
                targetCount = 7,
                completedCount = 7,
                actualSubmissionCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                acknowledgedAt = null,
                acknowledgedRevision = 0
            )
        )
        createCoinTransaction(userId, c1.id, 7, today.minusDays(1))
        titles.add(c1.title)

        // 2-2. [일부 실천] 매일 독서 30분 (확정, 4회 실천, 지각 1건, 4코인 적립)
        val c2 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userId,
                title = "📚 매일 독서 30분 (일부 실천 샘플)",
                verificationCriteria = "책 읽은 페이지 사진",
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY,
                startDate = today.minusDays(8),
                endDate = today.minusDays(2)
            )
        )
        val p2 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = c2.id,
                userId = userId,
                startDate = c2.startDate,
                penaltyAmount = 1000
            )
        )
        val r2 = challengeResultRepository.save(
            ChallengeResult(
                challengeId = c2.id,
                groupId = group.id,
                status = ChallengeResultStatus.CONFIRMED,
                startDate = c2.startDate,
                endDate = c2.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 4,
                achievementRate = 57.1,
                isSuccess = false,
                confirmedAt = LocalDateTime.now().minusDays(1),
                revision = 1
            )
        )
        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = r2.id,
                challengeId = c2.id,
                challengeParticipantId = p2.id,
                userId = userId,
                groupId = group.id,
                targetCount = 7,
                completedCount = 4,
                actualSubmissionCount = 5,
                achievementRate = 57.1,
                isSuccess = false,
                acknowledgedAt = null,
                acknowledgedRevision = 0
            )
        )
        // 지각 인증 1건 기록
        verificationRepository.save(
            Verification(
                groupId = group.id,
                challengeId = c2.id,
                userId = userId,
                targetDate = today.minusDays(3),
                imageUrl = "https://placehold.co/400x300?text=Late+Reading",
                isLate = true
            )
        )
        createCoinTransaction(userId, c2.id, 4, today.minusDays(1))
        titles.add(c2.title)

        // 2-3. [중단 챌린지] 알고리즘 1일 1문제 (중단됨, 사유 안내)
        val c3 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userId,
                title = "💻 알고리즘 1일 1문제 (중단 샘플)",
                verificationCriteria = "깃허브 커밋 링크",
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY,
                startDate = today.minusDays(6),
                endDate = today.minusDays(1)
            )
        )
        c3.abort(userId, "테스트 운영 사유로 조기 중단되었습니다.", LocalDateTime.now().minusDays(2))
        challengeRepository.save(c3)
        val p3 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = c3.id,
                userId = userId,
                startDate = c3.startDate,
                penaltyAmount = 1000
            )
        )
        val r3 = challengeResultRepository.save(
            ChallengeResult(
                challengeId = c3.id,
                groupId = group.id,
                status = ChallengeResultStatus.ABORTED,
                startDate = c3.startDate,
                endDate = c3.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 2,
                achievementRate = 28.5,
                isSuccess = false,
                abortedAt = c3.abortedAt,
                abortReason = c3.abortReason,
                revision = 1
            )
        )
        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = r3.id,
                challengeId = c3.id,
                challengeParticipantId = p3.id,
                userId = userId,
                groupId = group.id,
                targetCount = 7,
                completedCount = 2,
                actualSubmissionCount = 2,
                achievementRate = 28.5,
                isSuccess = false,
                acknowledgedAt = null,
                acknowledgedRevision = 0
            )
        )
        titles.add(c3.title)

        // 2-4. [잠정 집계] 물 2L 마시기 (PROVISIONAL)
        val c4 = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = userId,
                title = "💧 하루 물 2L 마시기 (잠정 집계 샘플)",
                verificationCriteria = "텀블러 사진",
                executionType = ExecutionType.INDIVIDUAL,
                periodType = PeriodType.DAILY,
                startDate = today.minusDays(7),
                endDate = today.minusDays(1)
            )
        )
        val p4 = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = c4.id,
                userId = userId,
                startDate = c4.startDate,
                penaltyAmount = 1000
            )
        )
        val r4 = challengeResultRepository.save(
            ChallengeResult(
                challengeId = c4.id,
                groupId = group.id,
                status = ChallengeResultStatus.PROVISIONAL,
                startDate = c4.startDate,
                endDate = c4.endDate,
                totalTargetCount = 7,
                totalCompletedCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                provisionalAt = LocalDateTime.now(),
                revision = 1
            )
        )
        challengeParticipantResultRepository.save(
            ChallengeParticipantResult(
                challengeResultId = r4.id,
                challengeId = c4.id,
                challengeParticipantId = p4.id,
                userId = userId,
                groupId = group.id,
                targetCount = 7,
                completedCount = 7,
                actualSubmissionCount = 7,
                achievementRate = 100.0,
                isSuccess = true,
                acknowledgedAt = null,
                acknowledgedRevision = 0
            )
        )
        titles.add(c4.title)

        return ResponseEntity.ok(
            SeedEndedChallengesResponse(
                message = "테스트용 종료 챌린지 4건(완주/일부/중단/잠정)이 성공적으로 생성되었습니다.",
                createdCount = titles.size,
                challengeTitles = titles
            )
        )
    }

    private fun createDefaultGroup(userId: Long): Group {
        val group = groupRepository.save(
            Group(
                name = "테스트 챌린지 모임",
                hostUserId = userId,
                inviteCode = "SEED-" + UUID.randomUUID().toString().take(6).uppercase()
            )
        )
        groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = userId,
                role = GroupRole.HOST
            )
        )
        return group
    }

    private fun createCoinTransaction(userId: Long, challengeId: Long, amount: Int, targetDate: LocalDate) {
        if (coinTransactionRepository == null) return
        val idempotencyKey = "SEED-GRANT-$userId-$challengeId"
        if (!coinTransactionRepository.existsByIdempotencyKey(idempotencyKey)) {
            coinTransactionRepository.save(
                CoinTransaction(
                    userId = userId,
                    type = CoinTransactionType.GRANT,
                    amount = amount,
                    balanceAfter = amount,
                    heldBalanceAfter = 0,
                    targetDate = targetDate,
                    challengeId = challengeId,
                    idempotencyKey = idempotencyKey,
                    status = CoinTransactionStatus.COMPLETED,
                    reason = "테스트용 챌린지 완주 코인 지급"
                )
            )
        }
    }
}
