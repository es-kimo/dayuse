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
            return calculateTogetherProgress(challenge, today)
        } else {
            return calculateIndividualProgress(challenge, myParticipant, today)
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
            executionType = ExecutionType.TOGETHER
        )

        val intervalDtos = calc.intervals.map { interval ->
            val status = when {
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
            executionType = ExecutionType.INDIVIDUAL
        )

        // 구간 DTO 매핑
        val intervalDtos = myCalc.intervals.map { interval ->
            ChallengePeriodIntervalDto(
                index = interval.index,
                startDate = interval.startDate,
                endDate = interval.endDate,
                targetCount = interval.targetCount,
                completedCount = interval.completedCount,
                isAchieved = interval.isAchieved,
                settlementStatus = if (interval.isAchieved) PeriodSettlementStatus.ACHIEVED else if (today > interval.endDate) PeriodSettlementStatus.NEEDS_CONFIRMATION else PeriodSettlementStatus.IN_PROGRESS
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
     fun onVerificationCreated(verification: Verification, challenge: Challenge) {
         // TODO [사용자 미션 3-1]: 함께하기 챌린지에서 특정 참여자가 인증을 등록했을 때, 모든 활성 참여자의 당일 기록을 동기화하세요.
         // 1. challenge.executionType != ExecutionType.TOGETHER 이면 아무 작업 없이 리턴
         // 2. 챌린지의 ACTIVE 상태인 참여자 목록 조회 (challengeParticipantRepository 활용)
         // 3. 각 참여자별로 참여 시작일(participant.startDate)이 인증 대상일(targetDate)보다 늦은 경우 제외(continue)
         // 4. dailyRecordService.ensureDailyRecordsForParticipant 호출하여 DailyRecord 보장
         // 5. 본인(participant.userId == verification.userId)인 경우:
         //    - 이미 COMPLETED가 아니라면 당일/지각 인증 반영 (targetDate < today 이면 verifyLate, 아니면 verifyToday)
         //    - 이미 COMPLETED인데 verificationId가 비어있다면 본인 인증 연결 (verifyToday)
         // 6. 타 참여자인 경우: completeJointly()를 호출하여 공동 완료 상태(verificationId=null 유지) 반영
     }

    /**
     * 인증 삭제 시 함께하기 챌린지의 공동 달성 여부를 재집계합니다.
     * - 동일 날짜에 타 참가자의 유효 인증이 남아있으면 '완료' 상태 유지 (본인의 verificationId만 해제)
     * - 해당 날짜의 마지막 남은 인증이 삭제되면 해당 날짜의 공동 달성 취소 (모든 참여자 롤백)
     */
    fun onVerificationDeleted(verification: Verification, challenge: Challenge) {
        // TODO [사용자 미션 3-2]: 함께하기 챌린지에서 인증이 삭제되었을 때 타 참가자의 인증 잔여 여부에 따라 동기화하세요.
        // 1. challenge.executionType != ExecutionType.TOGETHER 이면 아무 작업 없이 리턴
        // 2. verificationAggregator를 통해 targetDate에 남아있는 유효 인증 목록 조회
        // 3. 타 참가자의 인증이 1건 이상 남아있다면:
        //    - 삭제를 수행한 본인의 DailyRecord를 찾아 clearJointVerification() 호출 (공동 완료 상태는 유지)
        // 4. 마지막 남은 인증이 삭제된 경우:
        //    - 모든 활성 참가자의 targetDate DailyRecord를 찾아 rollbackVerification(today) 호출
    }
}
