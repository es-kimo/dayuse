package com.dayuse.domain.coin.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.result.ChallengeResultRepository
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.domain.coin.CandidateVerification
import com.dayuse.domain.coin.CoinEligibilityCalculator
import com.dayuse.domain.coin.CoinEligibilityResult
import com.dayuse.domain.coin.CoinPolicy
import com.dayuse.domain.coin.ParticipantCoinContext
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime

interface CoinEligibilityService {
    fun calculateEligibilityForParticipant(
        challengeId: Long,
        userId: Long,
        previouslyAwardedCoinsByDate: Map<LocalDate, Int> = emptyMap(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CoinEligibilityResult

    fun calculateEligibilityForAllParticipants(
        challengeId: Long,
        previouslyAwardedCoinsByUser: Map<Long, Map<LocalDate, Int>> = emptyMap(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Map<Long, CoinEligibilityResult>
}

@Service
@Transactional(readOnly = true)
class CoinEligibilityServiceImpl(
    private val challengeRepository: ChallengeRepository,
    private val challengeResultRepository: ChallengeResultRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val verificationRepository: VerificationRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val userRepository: UserRepository
) : CoinEligibilityService {

    override fun calculateEligibilityForParticipant(
        challengeId: Long,
        userId: Long,
        previouslyAwardedCoinsByDate: Map<LocalDate, Int>,
        now: LocalDateTime
    ): CoinEligibilityResult {
        val allResults = calculateEligibilityForAllParticipants(
            challengeId = challengeId,
            previouslyAwardedCoinsByUser = mapOf(userId to previouslyAwardedCoinsByDate),
            now = now
        )
        return allResults[userId] ?: throw ResourceNotFoundException("해당 참여자의 챌린지 정보를 찾을 수 없습니다. (userId: $userId)")
    }

    override fun calculateEligibilityForAllParticipants(
        challengeId: Long,
        previouslyAwardedCoinsByUser: Map<Long, Map<LocalDate, Int>>,
        now: LocalDateTime
    ): Map<Long, CoinEligibilityResult> {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        val challengeResult = challengeResultRepository.findByChallengeId(challengeId).orElse(null)
        val challengeStatus = challengeResult?.status ?: if (challenge.isAborted()) {
            ChallengeResultStatus.ABORTED
        } else {
            ChallengeResultStatus.PROVISIONAL
        }

        val participants = challengeParticipantRepository.findAllByChallengeId(challengeId)
        val verifications = verificationRepository.findAllByChallengeId(challengeId)
        val dailyRecords = dailyRecordRepository.findAllByChallengeId(challengeId)

        val redayAppliedSet = dailyRecords
            .filter { it.redayApplied }
            .map { it.userId to it.date }
            .toSet()

        val results = mutableMapOf<Long, CoinEligibilityResult>()

        if (challenge.executionType == ExecutionType.INDIVIDUAL) {
            for (participant in participants) {
                val user = userRepository.findById(participant.userId).orElse(null) ?: continue
                val userVerifications = verifications.filter { it.userId == participant.userId }

                val candidates = userVerifications.map { v ->
                    CandidateVerification(
                        verificationId = v.id,
                        targetDate = v.targetDate,
                        submittedAt = v.createdAt,
                        isLate = v.isLate,
                        isRedayApplied = redayAppliedSet.contains(participant.userId to v.targetDate)
                    )
                }

                val context = ParticipantCoinContext(
                    userId = participant.userId,
                    userCreatedAt = user.createdAt,
                    participantStartDate = participant.startDate,
                    challengeStatus = challengeStatus
                )

                val existingCoins = previouslyAwardedCoinsByUser[participant.userId] ?: emptyMap()
                results[participant.userId] = CoinEligibilityCalculator.calculate(
                    context = context,
                    candidates = candidates,
                    existingAwardedCoinsByDate = existingCoins,
                    now = now
                )
            }
        } else {
            // 함께하기(TOGETHER): 의무별 최초 유효 인증 수행자 1명만 코인용 기여 후보로 도출
            val creditedVerificationsByUser = resolveTogetherCreditedVerifications(
                challengeStartDate = challenge.startDate,
                challengeEndDate = challenge.endDate,
                periodType = challenge.periodType,
                targetFrequency = challenge.targetFrequency,
                isAborted = challenge.isAborted(),
                abortDate = challenge.abortedAt?.toLocalDate(),
                verifications = verifications
            )

            for (participant in participants) {
                val user = userRepository.findById(participant.userId).orElse(null) ?: continue
                val userCredited = creditedVerificationsByUser[participant.userId] ?: emptyList()

                val candidates = userCredited.map { v ->
                    CandidateVerification(
                        verificationId = v.id,
                        targetDate = v.targetDate,
                        submittedAt = v.createdAt,
                        isLate = v.isLate,
                        isRedayApplied = redayAppliedSet.contains(participant.userId to v.targetDate)
                    )
                }

                val context = ParticipantCoinContext(
                    userId = participant.userId,
                    userCreatedAt = user.createdAt,
                    participantStartDate = participant.startDate,
                    challengeStatus = challengeStatus
                )

                val existingCoins = previouslyAwardedCoinsByUser[participant.userId] ?: emptyMap()
                results[participant.userId] = CoinEligibilityCalculator.calculate(
                    context = context,
                    candidates = candidates,
                    existingAwardedCoinsByDate = existingCoins,
                    now = now
                )
            }
        }

        return results
    }

    private fun resolveTogetherCreditedVerifications(
        challengeStartDate: LocalDate,
        challengeEndDate: LocalDate,
        periodType: PeriodType,
        targetFrequency: Int?,
        isAborted: Boolean,
        abortDate: LocalDate?,
        verifications: List<Verification>
    ): Map<Long, List<Verification>> {
        val validSubmissions = verifications
            .filter { v ->
                !v.isLate &&
                v.targetDate in challengeStartDate..challengeEndDate &&
                (!isAborted || abortDate == null || v.targetDate < abortDate)
            }
            .sortedWith(compareBy({ it.targetDate }, { it.createdAt }, { it.id }))

        val firstEarliestPerDate = linkedMapOf<LocalDate, Verification>()
        for (v in validSubmissions) {
            if (!firstEarliestPerDate.containsKey(v.targetDate)) {
                firstEarliestPerDate[v.targetDate] = v
            }
        }

        val creditedVerifications = when (periodType) {
            PeriodType.DAILY -> {
                val effectiveEnd = if (isAborted && abortDate != null) {
                    minOf(challengeEndDate, abortDate.minusDays(1))
                } else {
                    challengeEndDate
                }
                firstEarliestPerDate.values.filter { it.targetDate in challengeStartDate..effectiveEnd }
            }
            PeriodType.WEEKLY_N -> {
                val periodCalc = ChallengePeriodCalculator.calculate(
                    challengeStartDate = challengeStartDate,
                    challengeEndDate = challengeEndDate,
                    participantStartDate = challengeStartDate,
                    periodType = periodType,
                    targetFrequency = targetFrequency,
                    completedDates = firstEarliestPerDate.keys,
                    today = challengeEndDate,
                    executionType = ExecutionType.TOGETHER,
                    abortedDate = abortDate
                )
                val credited = mutableListOf<Verification>()
                for (interval in periodCalc.intervals) {
                    val intervalVerifications = firstEarliestPerDate.values
                        .filter { it.targetDate in interval.startDate..interval.endDate }
                        .sortedBy { it.targetDate }
                        .take(interval.targetCount)
                    credited.addAll(intervalVerifications)
                }
                credited
            }
        }

        return creditedVerifications.groupBy { it.userId }
    }
}
