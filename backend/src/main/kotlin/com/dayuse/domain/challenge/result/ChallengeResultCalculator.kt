package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.verification.Verification
import com.dayuse.global.util.DateTimeUtils
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.temporal.ChronoUnit

data class ParticipantCalculationResult(
    val participantId: Long,
    val userId: Long,
    val participantStartDate: LocalDate,
    val targetCount: Int,
    val completedCount: Int,
    val contributionCount: Int,
    val actualSubmissionCount: Int,
    val achievementRate: Double?,
    val isSuccess: Boolean
)

data class ChallengeCalculationResult(
    val status: ChallengeResultStatus,
    val policyVersion: String,
    val totalTargetCount: Int,
    val totalCompletedCount: Int,
    val achievementRate: Double?,
    val isSuccess: Boolean,
    val participants: List<ParticipantCalculationResult>
)

object ChallengeResultCalculator {

    const val CURRENT_POLICY_VERSION: String = "v1"

    /**
     * 마지막 인증 인정 기한 산정 (KST 기준)
     * - 매일 각자하기: 마지막 수행일 익일 오전 09:00 KST
     * - 주 N회 각자하기: 마지막 집계 구간 종료일(endDate) 익일 오전 09:00 KST
     * - 리데이 사용 가능 기간 때문에 결과 확정을 지연시키지 않음
     */
    fun calculateFinalConfirmationDeadline(challenge: Challenge): LocalDateTime {
        return challenge.endDate.plusDays(1).atTime(9, 0)
    }

    /**
     * 운영 종료 시점 및 인정 기한 기반 결과 상태 판정
     * - 중단된 경우: ABORTED
     * - 최종 마감 인정 기한 경과 시: CONFIRMED
     * - 운영 종료 시점(endDate 익일 00:00) 경과 시: PROVISIONAL
     */
    fun evaluateResultStatus(
        challenge: Challenge,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeResultStatus {
        if (challenge.isAborted()) {
            return ChallengeResultStatus.ABORTED
        }
        val finalDeadline = calculateFinalConfirmationDeadline(challenge)
        if (!now.isBefore(finalDeadline)) {
            return ChallengeResultStatus.CONFIRMED
        }
        return ChallengeResultStatus.PROVISIONAL
    }

    /**
     * 달성률 안전 계산 (분모 0 나눗셈 예외 방어)
     * - targetCount == 0 이면 null 반환 (해당 없음)
     * - 소수점 둘째 자리까지 반올림
     */
    fun calculateAchievementRate(completedCount: Int, targetCount: Int): Double? {
        if (targetCount <= 0) return null
        val rawRate = (completedCount.toDouble() / targetCount.toDouble()) * 100.0
        return Math.round(rawRate * 100.0) / 100.0
    }

    /**
     * 전체 챌린지 결과 및 참여자별 결과 계산
     */
    fun calculate(
        challenge: Challenge,
        participants: List<ChallengeParticipant>,
        verifications: List<Verification>,
        dailyRecords: List<DailyRecord> = emptyList(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeCalculationResult {
        val status = evaluateResultStatus(challenge, now)
        val activeParticipants = participants.filter { it.status == ParticipantStatus.ACTIVE }

        return if (challenge.executionType.isTogether) {
            calculateTogether(
                challenge = challenge,
                participants = activeParticipants,
                verifications = verifications,
                status = status
            )
        } else {
            calculateIndividual(
                challenge = challenge,
                participants = activeParticipants,
                verifications = verifications,
                dailyRecords = dailyRecords,
                status = status
            )
        }
    }

    /**
     * 각자하기(INDIVIDUAL) 집계 계산: 매일형 및 주 N회형
     */
    private fun calculateIndividual(
        challenge: Challenge,
        participants: List<ChallengeParticipant>,
        verifications: List<Verification>,
        dailyRecords: List<DailyRecord>,
        status: ChallengeResultStatus
    ): ChallengeCalculationResult {
        val isAborted = (status == ChallengeResultStatus.ABORTED)
        val abortDate = challenge.abortedAt?.toLocalDate()

        val redayAppliedRecordKeys = dailyRecords
            .filter { it.redayApplied }
            .map { it.userId to it.date }
            .toSet()

        val participantResults = participants.map { participant ->
            val userVerifications = verifications.filter { it.userId == participant.userId }
            val actualSubmissions = userVerifications.filter {
                it.targetDate >= participant.startDate && it.targetDate <= challenge.endDate
            }.size

            val validVerifications = userVerifications.filter { v ->
                v.targetDate >= participant.startDate &&
                v.targetDate <= challenge.endDate &&
                !v.isLate &&
                !redayAppliedRecordKeys.contains(participant.userId to v.targetDate)
            }
            val validDates = validVerifications.map { it.targetDate }.toSet()

            when (challenge.periodType) {
                PeriodType.DAILY -> {
                    val effectiveEnd = if (isAborted && abortDate != null) {
                        minOf(challenge.endDate, abortDate.minusDays(1))
                    } else {
                        challenge.endDate
                    }

                    val target = if (effectiveEnd < participant.startDate) {
                        0
                    } else {
                        (ChronoUnit.DAYS.between(participant.startDate, effectiveEnd).toInt() + 1).coerceAtLeast(0)
                    }

                    val completed = validDates.count { date ->
                        date in participant.startDate..effectiveEnd
                    }

                    val rate = calculateAchievementRate(completed, target)
                    val isSuccess = !isAborted && target > 0 && completed == target

                    ParticipantCalculationResult(
                        participantId = participant.id,
                        userId = participant.userId,
                        participantStartDate = participant.startDate,
                        targetCount = target,
                        completedCount = completed,
                        contributionCount = completed,
                        actualSubmissionCount = actualSubmissions,
                        achievementRate = rate,
                        isSuccess = isSuccess
                    )
                }

                PeriodType.WEEKLY_N -> {
                    val periodCalc = ChallengePeriodCalculator.calculate(
                        challengeStartDate = challenge.startDate,
                        challengeEndDate = challenge.endDate,
                        participantStartDate = participant.startDate,
                        periodType = challenge.periodType,
                        targetFrequency = challenge.targetFrequency,
                        completedDates = validDates,
                        today = challenge.endDate,
                        executionType = ExecutionType.INDIVIDUAL,
                        abortedDate = abortDate
                    )

                    val target = periodCalc.totalTargetCount
                    val completed = periodCalc.totalCompletedCount
                    val rate = calculateAchievementRate(completed, target)
                    val isSuccess = !isAborted && target > 0 && completed == target

                    ParticipantCalculationResult(
                        participantId = participant.id,
                        userId = participant.userId,
                        participantStartDate = participant.startDate,
                        targetCount = target,
                        completedCount = completed,
                        contributionCount = completed,
                        actualSubmissionCount = actualSubmissions,
                        achievementRate = rate,
                        isSuccess = isSuccess
                    )
                }
            }
        }

        val totalTarget = participantResults.sumOf { it.targetCount }
        val totalCompleted = participantResults.sumOf { it.completedCount }
        val totalRate = calculateAchievementRate(totalCompleted, totalTarget)
        val overallSuccess = !isAborted && totalTarget > 0 && totalCompleted == totalTarget

        return ChallengeCalculationResult(
            status = status,
            policyVersion = CURRENT_POLICY_VERSION,
            totalTargetCount = totalTarget,
            totalCompletedCount = totalCompleted,
            achievementRate = totalRate,
            isSuccess = overallSuccess,
            participants = participantResults
        )
    }

    /**
     * 함께하기(TOGETHER) 집계 계산:
     * - 공동 의무 1개당 최초 유효 인증 수행자 1명만 코인용 기여자로 인정
     * - 지각 인증은 코인용 인정 수행에서 제외
     * - 공동 목표 달성률과 개인 기여 횟수 분리 집계
     */
    private fun calculateTogether(
        challenge: Challenge,
        participants: List<ChallengeParticipant>,
        verifications: List<Verification>,
        status: ChallengeResultStatus
    ): ChallengeCalculationResult {
        val isAborted = (status == ChallengeResultStatus.ABORTED)
        val abortDate = challenge.abortedAt?.toLocalDate()

        val validSubmissions = verifications
            .filter { v ->
                !v.isLate &&
                v.targetDate >= challenge.startDate &&
                v.targetDate <= challenge.endDate &&
                (!isAborted || abortDate == null || v.targetDate < abortDate)
            }
            .sortedWith(compareBy({ it.targetDate }, { it.createdAt }, { it.id }))

        // 의무별 최초 1인 기여자 판정
        // 날짜별로 가장 먼저 등록된 유효 인증자 1명 선정
        val firstEarliestPerDate = linkedMapOf<LocalDate, Verification>()
        for (v in validSubmissions) {
            if (!firstEarliestPerDate.containsKey(v.targetDate)) {
                firstEarliestPerDate[v.targetDate] = v
            }
        }

        val (totalTarget, creditedVerifications) = when (challenge.periodType) {
            PeriodType.DAILY -> {
                val effectiveEnd = if (isAborted && abortDate != null) {
                    minOf(challenge.endDate, abortDate.minusDays(1))
                } else {
                    challenge.endDate
                }
                val target = if (effectiveEnd < challenge.startDate) {
                    0
                } else {
                    (ChronoUnit.DAYS.between(challenge.startDate, effectiveEnd).toInt() + 1).coerceAtLeast(0)
                }
                val credited = firstEarliestPerDate.values.filter { it.targetDate in challenge.startDate..effectiveEnd }
                target to credited
            }

            PeriodType.WEEKLY_N -> {
                val dates = firstEarliestPerDate.keys
                val periodCalc = ChallengePeriodCalculator.calculate(
                    challengeStartDate = challenge.startDate,
                    challengeEndDate = challenge.endDate,
                    participantStartDate = challenge.startDate,
                    periodType = challenge.periodType,
                    targetFrequency = challenge.targetFrequency,
                    completedDates = dates,
                    today = challenge.endDate,
                    executionType = ExecutionType.TOGETHER,
                    abortedDate = abortDate
                )

                // 주간 초과 수행 상계 불가: 각 구간별 targetCount 한도 내에서 날짜별 최초 인증 건만 인정
                val credited = mutableListOf<Verification>()
                for (interval in periodCalc.intervals) {
                    val intervalVerifications = firstEarliestPerDate.values
                        .filter { it.targetDate in interval.startDate..interval.endDate }
                        .sortedBy { it.targetDate }
                        .take(interval.targetCount) // 구간 목표치까지만 코인/집계 기여로 인정
                    credited.addAll(intervalVerifications)
                }

                periodCalc.totalTargetCount to credited
            }
        }

        val totalCompleted = creditedVerifications.size
        val totalRate = calculateAchievementRate(totalCompleted, totalTarget)
        val overallSuccess = !isAborted && totalTarget > 0 && totalCompleted == totalTarget

        // 각 참가자별 기여 횟수 및 실제 제출 횟수 산정
        val contributionByUser = creditedVerifications.groupingBy { it.userId }.eachCount()

        val participantResults = participants.map { participant ->
            val userAllSubmissions = verifications.filter {
                it.userId == participant.userId &&
                it.targetDate >= participant.startDate &&
                it.targetDate <= challenge.endDate
            }.size

            val contribution = contributionByUser[participant.userId] ?: 0

            ParticipantCalculationResult(
                participantId = participant.id,
                userId = participant.userId,
                participantStartDate = participant.startDate,
                targetCount = totalTarget,
                completedCount = totalCompleted,
                contributionCount = contribution,
                actualSubmissionCount = userAllSubmissions,
                achievementRate = totalRate,
                isSuccess = overallSuccess
            )
        }

        return ChallengeCalculationResult(
            status = status,
            policyVersion = CURRENT_POLICY_VERSION,
            totalTargetCount = totalTarget,
            totalCompletedCount = totalCompleted,
            achievementRate = totalRate,
            isSuccess = overallSuccess,
            participants = participantResults
        )
    }
}
