package com.dayuse.domain.challenge.service

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ExecutionType
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.dto.ChallengePeriodIntervalDto
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.service.VerificationAggregator
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

data class ChallengeProgressResult(
    val totalTargetCount: Int,
    val totalCompletedCount: Int,
    val progressRate: Int,
    val currentPeriod: ChallengePeriodIntervalDto?,
    val intervals: List<ChallengePeriodIntervalDto>
)

@Service
@Transactional
class ChallengeProgressService(
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val verificationAggregator: VerificationAggregator,
    private val dailyRecordRepository: DailyRecordRepository,
    private val dailyRecordService: DailyRecordService
) {
    /**
     * 챌린지 수행 방식(각자하기 / 함께하기)에 맞추어 진척도 및 구간 DTO를 계산합니다.
     */
    @Transactional(readOnly = true)
    fun calculateProgress(
        challenge: Challenge,
        myParticipant: ChallengeParticipant?,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeProgressResult {
        if (challenge.executionType == ExecutionType.TOGETHER) {
            return calculateTogetherProgress(
                challenge,
                today
            )
        } else {
            return calculateIndividualProgress(
                challenge,
                myParticipant,
                today
            )
        }
    }

    private fun calculateTogetherProgress(
        challenge: Challenge,
        today: LocalDate
    ): ChallengeProgressResult {
        val completedDates = verificationAggregator.getCompletedDates(challenge.id)

        val calc = ChallengePeriodCalculator.calculate(
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            participantStartDate = challenge.startDate,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            completedDates = completedDates,
            today = today,
            executionType = ExecutionType.TOGETHER,
            abortedDate = challenge.abortedAt?.toLocalDate()
        )

        val intervalDtos = calc.intervals.map { interval ->
            val status = when {
                challenge.isAborted() && interval.endDate >= challenge.abortedAt!!.toLocalDate() -> PeriodSettlementStatus.EXCLUDED_ABORTED
                interval.isAchieved -> PeriodSettlementStatus.ACHIEVED
                today > interval.endDate -> PeriodSettlementStatus.NOT_ACHIEVED
                else -> PeriodSettlementStatus.IN_PROGRESS
            }

            ChallengePeriodIntervalDto(
                index = interval.index,
                startDate = interval.startDate,
                endDate = interval.endDate,
                targetCount = interval.targetCount,
                completedCount = interval.completedCount,
                isAchieved = interval.isAchieved,
                settlementStatus = status,
                settlementId = null,
                missedCount = if (status == PeriodSettlementStatus.NOT_ACHIEVED) interval.remainingTarget else 0,
                penaltyAmountPerMiss = 0,
                totalPenaltyAmount = 0,
                depositStatus = null
            )
        }

        val currentPeriodDto = intervalDtos.find { today in it.startDate..it.endDate }
            ?: if (today < challenge.startDate) intervalDtos.firstOrNull() else intervalDtos.lastOrNull()

        return ChallengeProgressResult(
            totalTargetCount = calc.totalTargetCount,
            totalCompletedCount = calc.totalCompletedCount,
            progressRate = calc.progressRate,
            currentPeriod = currentPeriodDto,
            intervals = intervalDtos
        )
    }

    private fun calculateIndividualProgress(
        challenge: Challenge,
        myParticipant: ChallengeParticipant?,
        today: LocalDate
    ): ChallengeProgressResult {
        val myEffectiveStart = myParticipant?.let {
            if (it.startDate > challenge.startDate) it.startDate else challenge.startDate
        } ?: challenge.startDate

        val myRecords = myParticipant?.let { p ->
            dailyRecordRepository.findAllByChallengeParticipantId(p.id)
                .filter { it.status == DailyRecordStatus.COMPLETED && it.verificationId != null }
        }.orEmpty()
        val myCompletedDates = myRecords.map { it.date }.toSet()

        val myCalc = ChallengePeriodCalculator.calculate(
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            participantStartDate = myEffectiveStart,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            completedDates = myCompletedDates,
            today = today,
            executionType = ExecutionType.INDIVIDUAL,
            abortedDate = challenge.abortedAt?.toLocalDate()
        )

        // 구간 DTO 매핑
        val intervalDtos = myCalc.intervals.map { interval ->
            val status = when {
                challenge.isAborted() && interval.endDate >= challenge.abortedAt!!.toLocalDate() -> PeriodSettlementStatus.EXCLUDED_ABORTED
                interval.isAchieved -> PeriodSettlementStatus.ACHIEVED
                today > interval.endDate -> PeriodSettlementStatus.NEEDS_CONFIRMATION
                else -> PeriodSettlementStatus.IN_PROGRESS
            }
            ChallengePeriodIntervalDto(
                index = interval.index,
                startDate = interval.startDate,
                endDate = interval.endDate,
                targetCount = interval.targetCount,
                completedCount = interval.completedCount,
                isAchieved = interval.isAchieved,
                settlementStatus = status
            )
        }

        val currentPeriodDto = intervalDtos.find { today in it.startDate..it.endDate }
            ?: if (today < myEffectiveStart) intervalDtos.firstOrNull() else intervalDtos.lastOrNull()

        return ChallengeProgressResult(
            totalTargetCount = myCalc.totalTargetCount,
            totalCompletedCount = myCalc.totalCompletedCount,
            progressRate = myCalc.progressRate,
            currentPeriod = currentPeriodDto,
            intervals = intervalDtos
        )
    }

    /**
     * 인증 등록 시 함께하기 챌린지의 참여자 일일 기록 및 공동 달성을 즉시 반영합니다.
     */
    fun onVerificationCreated(
        verification: Verification,
        challenge: Challenge
    ) {
        if (challenge.executionType != ExecutionType.TOGETHER) {
            return
        }

        val today = DateTimeUtils.todayKst()
        val targetDate = verification.targetDate
        val participants = challengeParticipantRepository.findAllByChallengeIdAndStatus(
            challenge.id,
            ParticipantStatus.ACTIVE
        )

        for (participant in participants) {
            if (participant.startDate > targetDate) {
                continue
            }

            dailyRecordService.ensureDailyRecordsForParticipant(
                participant,
                challenge,
                today
            )

            val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
                participant.id,
                targetDate
            )

            record?.let {
                if (participant.userId == verification.userId) {
                    if (it.status != DailyRecordStatus.COMPLETED) {
                        if (targetDate < today) {
                            it.verifyLate(
                                verification.id,
                                isLate = verification.isLate,
                                today = today
                            )
                        } else {
                            it.verifyToday(verification.id)
                        }
                    } else if (it.verificationId == null) {
                        it.verifyToday(verification.id)
                    }
                } else {
                    // 타 참여자는 가짜 인증 ID 없이 공동 완료 상태만 반영
                    it.completeJointly()
                }
            }
        }
    }

    /**
     * 인증 삭제 시 함께하기 챌린지의 공동 달성 여부를 재집계합니다.
     * - 동일 날짜에 타 참가자의 유효 인증이 남아있으면 '완료' 상태 유지 (본인의 verificationId만 해제)
     * - 해당 날짜의 마지막 남은 인증이 삭제되면 해당 날짜의 공동 달성 취소 (모든 참여자 롤백)
     */
    fun onVerificationDeleted(
        verification: Verification,
        challenge: Challenge
    ) {
        if (challenge.executionType != ExecutionType.TOGETHER) {
            return
        }

        val today = DateTimeUtils.todayKst()
        val targetDate = verification.targetDate
        val remainingVerifications = verificationAggregator.findVerificationsOnDate(
            challenge.id,
            targetDate
        )

        val participants = challengeParticipantRepository.findAllByChallengeIdAndStatus(
            challenge.id,
            ParticipantStatus.ACTIVE
        )

        if (remainingVerifications.isNotEmpty()) {
            // 다른 참가자의 유효 인증이 1건 이상 남아있는 경우:
            // 삭제를 수행한 본인의 DailyRecord에서 verificationId만 제거하고 상태는 COMPLETED 유지
            val myParticipant = participants.find { it.userId == verification.userId }
            if (myParticipant != null) {
                val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
                    myParticipant.id,
                    targetDate
                )
                record?.clearJointVerification()
            }
        } else {
            // 마지막 남은 인증이 삭제된 경우: 공동 달성 취소 (모든 참여자의 해당 일자 기록 롤백)
            for (participant in participants) {
                val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
                    participant.id,
                    targetDate
                )
                record?.rollbackVerification(today)
            }
        }
    }
}
