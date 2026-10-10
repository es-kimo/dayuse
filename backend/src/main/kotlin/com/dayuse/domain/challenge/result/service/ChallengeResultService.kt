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
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
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
    private val groupMemberRepository: GroupMemberRepository
) {

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
            existingResult
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
        if (resultOpt.isPresent) {
            val result = resultOpt.get()
            val participants = challengeParticipantResultRepository.findAllByChallengeId(challengeId)
            return ChallengeResultResponse.of(result, participants)
        }

        // 결과가 아직 없지만 종료 시점에 도달했거나 중단된 경우 온디맨드 집계
        val operationEnd = challenge.endDate.plusDays(1).atStartOfDay()
        if (challenge.isAborted() || now >= operationEnd) {
            return aggregateAndSave(challengeId, now)
        }

        throw ResourceNotFoundException("아직 집계된 챌린지 결과가 없습니다.")
    }
}
