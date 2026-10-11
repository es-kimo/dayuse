package com.dayuse.domain.challenge.result.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.result.ChallengeParticipantResult
import com.dayuse.domain.challenge.result.ChallengeParticipantResultRepository
import com.dayuse.domain.challenge.result.ChallengeResult
import com.dayuse.domain.challenge.result.ChallengeResultCalculator
import com.dayuse.domain.challenge.result.ChallengeResultRepository
import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.domain.challenge.result.dto.ChallengeResultResponse
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.coin.service.CoinEligibilityService
import com.dayuse.domain.coin.service.CoinTransactionService
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.coin.CoinTransactionRepository
import com.dayuse.domain.coin.CoinTransactionType
import com.dayuse.domain.coin.CoinTransactionStatus
import com.dayuse.domain.challenge.result.dto.ChallengeParticipantResultResponse
import com.dayuse.domain.challenge.result.dto.EndedChallengesSummaryResponse
import com.dayuse.domain.challenge.result.dto.EndedChallengeSummaryItem
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
class ChallengeResultService(
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val challengeResultRepository: ChallengeResultRepository,
    private val challengeParticipantResultRepository: ChallengeParticipantResultRepository,
    private val verificationRepository: VerificationRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val groupRepository: GroupRepository? = null,
    private val coinTransactionRepository: CoinTransactionRepository? = null,
    private val coinEligibilityService: CoinEligibilityService? = null,
    private val coinTransactionService: CoinTransactionService? = null,
    private val challengeAnalyticsRecorder: com.dayuse.domain.analytics.service.ChallengeAnalyticsRecorder? = null
) {
    private val log = LoggerFactory.getLogger(javaClass)


    /**
     * 특정 챌린지의 종료 결과를 집계하고 저장/갱신합니다.
     */
    fun aggregateAndSave(
        challengeId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeResultResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        val operationEnd = challenge.endDate.plusDays(1).atStartOfDay()
        if (!challenge.isAborted() && now < operationEnd) {
            throw BadRequestException("아직 운영 기간이 종료되지 않은 챌린지입니다.")
        }

        val participants = challengeParticipantRepository.findAllByChallengeId(challengeId)
        val verifications = verificationRepository.findAllByChallengeId(challengeId)
        val dailyRecords = dailyRecordRepository.findAllByChallengeId(challengeId)

        val calculation = ChallengeResultCalculator.calculate(
            challenge = challenge,
            participants = participants,
            verifications = verifications,
            dailyRecords = dailyRecords,
            now = now
        )

        val existingResult = challengeResultRepository.findByChallengeId(challengeId).orElse(null)
        val challengeResult = if (existingResult != null) {
            existingResult.updateMetrics(
                status = calculation.status,
                totalTargetCount = calculation.totalTargetCount,
                totalCompletedCount = calculation.totalCompletedCount,
                achievementRate = calculation.achievementRate,
                isSuccess = calculation.isSuccess,
                now = now
            )
            challengeResultRepository.save(existingResult)
        } else {
            val newResult = ChallengeResult(
                challengeId = challenge.id,
                groupId = challenge.groupId,
                status = calculation.status,
                policyVersion = calculation.policyVersion,
                executionType = challenge.executionType,
                periodType = challenge.periodType,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                totalTargetCount = calculation.totalTargetCount,
                totalCompletedCount = calculation.totalCompletedCount,
                achievementRate = calculation.achievementRate,
                isSuccess = calculation.isSuccess,
                abortedAt = challenge.abortedAt,
                abortReason = challenge.abortReason,
                provisionalAt = if (calculation.status == ChallengeResultStatus.PROVISIONAL) now else null,
                confirmedAt = if (calculation.status in listOf(ChallengeResultStatus.CONFIRMED, ChallengeResultStatus.ABORTED)) now else null
            )
            challengeResultRepository.save(newResult)
        }

        val existingParticipantResults = challengeParticipantResultRepository
            .findAllByChallengeId(challengeId)
            .associateBy { it.userId }

        val savedParticipantResults = calculation.participants.map { partCalc ->
            val existing = existingParticipantResults[partCalc.userId]
            if (existing != null) {
                existing.updateMetrics(
                    targetCount = partCalc.targetCount,
                    completedCount = partCalc.completedCount,
                    contributionCount = partCalc.contributionCount,
                    actualSubmissionCount = partCalc.actualSubmissionCount,
                    achievementRate = partCalc.achievementRate,
                    isSuccess = partCalc.isSuccess
                )
                existing
            } else {
                challengeParticipantResultRepository.save(
                    ChallengeParticipantResult(
                        challengeResultId = challengeResult.id,
                        challengeId = challenge.id,
                        challengeParticipantId = partCalc.participantId,
                        userId = partCalc.userId,
                        groupId = challenge.groupId,
                        participantStartDate = partCalc.participantStartDate,
                        targetCount = partCalc.targetCount,
                        completedCount = partCalc.completedCount,
                        contributionCount = partCalc.contributionCount,
                        actualSubmissionCount = partCalc.actualSubmissionCount,
                        achievementRate = partCalc.achievementRate,
                        isSuccess = partCalc.isSuccess
                    )
                )
            }
        }

        // F06, 5.4: 결과 화면을 열지 않아도 확정 시 적격 코인 백그라운드 자동 지급
        if (challengeResult.status == ChallengeResultStatus.CONFIRMED && coinEligibilityService != null && coinTransactionService != null) {
            try {
                val eligibilityMap = coinEligibilityService.calculateEligibilityForAllParticipants(challengeId, emptyMap(), now)
                for ((userId, eligibility) in eligibilityMap) {
                    if (eligibility.eligibleDates.isNotEmpty()) {
                        coinTransactionService.grantCoins(
                            userId = userId,
                            challengeId = challengeId,
                            eligibleDates = eligibility.eligibleDates,
                            now = now
                        )
                    }
                }
            } catch (e: Exception) {
                log.error("[ChallengeResultService] Failed to auto-grant coins for challenge $challengeId", e)
            }
        }

        return ChallengeResultResponse.of(challengeResult, savedParticipantResults)
    }

    /**
     * 운영 종료 또는 최종 마감 기한에 도달한 챌린지들을 일괄 집계 및 상태 전환합니다.
     */
    fun processEndedChallenges(now: LocalDateTime = DateTimeUtils.nowKst()): Int {
        val allChallenges = challengeRepository.findAll()
        var processedCount = 0

        for (challenge in allChallenges) {
            val isAborted = challenge.isAborted()
            val isOperationEnded = now >= challenge.endDate.plusDays(1).atStartOfDay()

            if (!isAborted && !isOperationEnded) {
                continue
            }

            val resultOpt = challengeResultRepository.findByChallengeId(challenge.id)
            val shouldProcess = if (resultOpt.isEmpty) {
                true
            } else {
                val existing = resultOpt.get()
                // 잠정 상태이면서 최종 마감 기한에 도달한 경우 확정으로 전환 필요
                existing.status == ChallengeResultStatus.PROVISIONAL &&
                        now >= ChallengeResultCalculator.calculateFinalConfirmationDeadline(challenge)
            }

            if (shouldProcess) {
                aggregateAndSave(challenge.id, now)
                processedCount++
            }
        }

        return processedCount
    }

    /**
     * 챌린지 결과 조회 (모임 멤버십 검증 포함)
     */
    @Transactional(readOnly = true)
    fun getResult(
        groupId: Long,
        challengeId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeResultResponse {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 결과를 조회할 수 있습니다.")

        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (challenge.groupId != groupId) {
            throw BadRequestException("해당 모임의 챌린지가 아닙니다.")
        }

        val resultOpt = challengeResultRepository.findByChallengeId(challengeId)
        val result = if (resultOpt.isPresent) {
            resultOpt.get()
        } else {
            // 결과가 아직 없지만 종료 시점에 도달했거나 중단된 경우 온디맨드 집계
            val operationEnd = challenge.endDate.plusDays(1).atStartOfDay()
            if (challenge.isAborted() || now >= operationEnd) {
                return aggregateAndSave(challengeId, now)
            }
            throw ResourceNotFoundException("아직 집계된 챌린지 결과가 없습니다.")
        }

        val participants = challengeParticipantResultRepository.findAllByChallengeId(challengeId)
        val verifications = verificationRepository.findAllByChallengeId(challengeId)
        val lateCountMap = verifications.filter { it.isLate }.groupBy { it.userId }.mapValues { it.value.size }

        val coinTxs = coinTransactionRepository?.findAllByChallengeId(challengeId) ?: emptyList()
        val coinTxsByUser = coinTxs.groupBy { it.userId }
        val coinRewardMap = coinTxsByUser.mapValues { (_, txs) ->
            txs.filter { it.type in listOf(CoinTransactionType.GRANT, CoinTransactionType.ADJUSTMENT_ADD) && it.status == CoinTransactionStatus.COMPLETED }
                .sumOf { it.amount }
        }
        val coinStatusMap = coinTxsByUser.mapValues { (_, txs) ->
            when {
                txs.any { it.status == CoinTransactionStatus.HELD } -> "PENDING"
                txs.any { it.status == CoinTransactionStatus.COMPLETED } -> "GRANTED"
                else -> "NONE"
            }
        }

        return ChallengeResultResponse.of(
            result = result,
            participants = participants,
            lateCountMap = lateCountMap,
            coinRewardMap = coinRewardMap,
            coinStatusMap = coinStatusMap
        )
    }

    /**
     * 확정 결과 열람 시 계정별 확인 상태(acknowledged) 기록 (F02, 5.5)
     * - 잠정 결과(PROVISIONAL)는 확인 완료 처리를 유보하고 BadRequestException 발생
     * - 확정(CONFIRMED) 또는 중단(ABORTED) 상태인 경우 현재 revision으로 확인 상태 기록
     */
    fun acknowledgeResult(
        groupId: Long,
        challengeId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeParticipantResultResponse {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 결과를 확인할 수 있습니다.")

        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (challenge.groupId != groupId) {
            throw BadRequestException("해당 모임의 챌린지가 아닙니다.")
        }

        val challengeResult = challengeResultRepository.findByChallengeId(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지 결과를 찾을 수 없습니다.")
        }

        if (challengeResult.status == ChallengeResultStatus.PROVISIONAL) {
            throw BadRequestException("잠정 결과는 확정 전까지 확인 완료 처리할 수 없습니다.")
        }

        val participantResult = challengeParticipantResultRepository
            .findByChallengeIdAndUserId(challengeId, userId)
            .orElseThrow {
                ResourceNotFoundException("챌린지 참여 결과를 찾을 수 없습니다.")
            }

        participantResult.acknowledge(challengeResult.revision, now)

        val verifications = verificationRepository.findAllByChallengeId(challengeId)
        val lateCount = verifications.count { it.userId == userId && it.isLate }
        val coinTxs = coinTransactionRepository?.findAllByUserIdAndChallengeId(userId, challengeId) ?: emptyList()
        val coinReward = coinTxs.filter { it.type in listOf(CoinTransactionType.GRANT, CoinTransactionType.ADJUSTMENT_ADD) && it.status == CoinTransactionStatus.COMPLETED }.sumOf { it.amount }
        val coinStatus = when {
            coinTxs.any { it.status == CoinTransactionStatus.HELD } -> "PENDING"
            coinReward > 0 -> "GRANTED"
            else -> "NONE"
        }

        challengeAnalyticsRecorder?.challengeResultAcknowledged(
            userId = userId,
            challengeId = challengeId,
            groupId = groupId,
            revision = challengeResult.revision,
            lateCount = lateCount,
            coinRewardCount = coinReward,
            coinGrantStatus = coinStatus
        )

        return ChallengeParticipantResultResponse.from(
            entity = participantResult,
            currentRevision = challengeResult.revision,
            lateCount = lateCount,
            coinRewardCount = coinReward,
            coinGrantStatus = coinStatus
        )
    }

    /**
     * 로그인한 사용자의 모든 종료 챌린지 결과 요약 및 홈 미확인 건수 집계 (F02, F04)
     */
    @Transactional(readOnly = true)
    fun getEndedChallengesSummary(
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): EndedChallengesSummaryResponse {
        val participantResults = challengeParticipantResultRepository.findAllByUserId(userId)
        if (participantResults.isEmpty()) {
            return EndedChallengesSummaryResponse(unacknowledgedCount = 0, items = emptyList())
        }

        val challengeIds = participantResults.map { it.challengeId }
        val challenges = challengeRepository.findAllById(challengeIds).associateBy { it.id }
        val challengeResults = challengeResultRepository.findAll().filter { it.challengeId in challengeIds }.associateBy { it.challengeId }
        val groupIds = challenges.values.map { it.groupId }.distinct()
        val groups = groupRepository?.findAllById(groupIds)?.associateBy { it.id } ?: emptyMap()
        val coinTxs = coinTransactionRepository?.findAllByUserId(userId)?.filter { it.challengeId in challengeIds } ?: emptyList()
        val coinTxsByChallenge = coinTxs.groupBy { it.challengeId }

        var unacknowledgedCount = 0
        val items = mutableListOf<EndedChallengeSummaryItem>()

        for (partResult in participantResults) {
            val challenge = challenges[partResult.challengeId] ?: continue
            val result = challengeResults[partResult.challengeId]
            val group = groups[challenge.groupId]

            val resultStatus = result?.status ?: if (challenge.isAborted()) ChallengeResultStatus.ABORTED else ChallengeResultStatus.PROVISIONAL
            val currentRev = result?.revision ?: 1
            val isAck = partResult.isAcknowledged(currentRev)
            val isRev = partResult.isRevised(currentRev)

            // 확정/중단 상태이며, 아직 미확인이거나 결과가 수정된 경우 미확인 카운트에 반영
            val isUnacknowledged = (resultStatus == ChallengeResultStatus.CONFIRMED || resultStatus == ChallengeResultStatus.ABORTED) && (!isAck || isRev)
            if (isUnacknowledged) {
                unacknowledgedCount++
            }

            val txs = coinTxsByChallenge[challenge.id] ?: emptyList()
            val coinReward = txs.filter { it.type in listOf(CoinTransactionType.GRANT, CoinTransactionType.ADJUSTMENT_ADD) && it.status == CoinTransactionStatus.COMPLETED }.sumOf { it.amount }
            val coinStatus = when {
                txs.any { it.status == CoinTransactionStatus.HELD } -> "PENDING"
                coinReward > 0 -> "GRANTED"
                else -> "NONE"
            }

            items.add(
                EndedChallengeSummaryItem(
                    challengeId = challenge.id,
                    groupId = challenge.groupId,
                    groupName = group?.name ?: "",
                    challengeTitle = challenge.title,
                    status = resultStatus,
                    executionType = challenge.executionType,
                    periodType = challenge.periodType,
                    startDate = challenge.startDate,
                    endDate = challenge.endDate,
                    targetCount = partResult.targetCount,
                    completedCount = partResult.completedCount,
                    achievementRate = partResult.achievementRate,
                    isSuccess = partResult.isSuccess,
                    isAcknowledged = isAck,
                    isRevised = isRev,
                    acknowledgedAt = partResult.acknowledgedAt,
                    abortedAt = challenge.abortedAt ?: result?.abortedAt,
                    abortReason = challenge.abortReason ?: result?.abortReason,
                    coinRewardCount = coinReward,
                    coinGrantStatus = coinStatus
                )
            )
        }

        return EndedChallengesSummaryResponse(
            unacknowledgedCount = unacknowledgedCount,
            items = items.sortedByDescending { it.endDate }
        )
    }
}
