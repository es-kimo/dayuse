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
        // TODO [사용자 미션 1-1]: 마지막 인증 인정 기한 산정 (KST 기준)
        // - 매일 각자하기: 마지막 수행일(endDate) 익일 오전 09:00 KST
        // - 주 N회 각자하기: 마지막 집계 구간 종료일(endDate) 익일 오전 09:00 KST
        // - 리데이 사용 가능 기간 때문에 결과 확정을 지연시키지 않음
        throw NotImplementedError("사용자 미션 1-1 구현 필요")
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
        // TODO [사용자 미션 1-2]: 운영 종료 시점 및 인정 기한 기반 결과 상태 판정
        // - 1) 중단된 챌린지: ChallengeResultStatus.ABORTED
        // - 2) 최종 마감 인정 기한(calculateFinalConfirmationDeadline) 경과 시: ChallengeResultStatus.CONFIRMED
        // - 3) 그 외: ChallengeResultStatus.PROVISIONAL
        throw NotImplementedError("사용자 미션 1-2 구현 필요")
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
        // TODO [사용자 미션 2]: 각자하기(INDIVIDUAL) 유형별 목표 및 인정 횟수 산정 엔진 구현
        // 1) 지각(isLate == true) 및 리데이(dailyRecord.redayApplied == true) 인증은 코인/집계 인정 수행에서 제외
        // 2) 개인 참가 기간(participant.startDate .. challenge.endDate) 내 유효 인증만 집계
        // 3) 매일형: 참가 시작일부터 종료일까지의 일수(T) 및 일치 여부(C == T)로 완주 판정 (중단 시 abortDate 고려)
        // 4) 주 N회형: ChallengePeriodCalculator를 활용하여 7일 구간별 초과 수행 상계 불가(effectiveCompletedCount) 집계
        // 5) 달성률: T=0 방어(null) 및 C == T 일치 완주 여부 산정
        throw NotImplementedError("사용자 미션 2 구현 필요")
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
        // TODO [사용자 미션 3]: 함께하기(TOGETHER) 공동 의무별 최초 1인 기여자 판정 및 달성률/기여 분리 집계
        // 1) 지각 인증(isLate == true) 제외
        // 2) 공동 의무 1개당(매일형: targetDate별 최초 등록자 1명, 주 N회형: 구간 목표 N회 슬롯) 최초 유효 인증 수행자 1명만 코인용 기여자로 인정
        // 3) 동일 일자 후순위 인증자는 실제 제출 횟수(actualSubmissionCount)에는 반영하되 기여 횟수/공동 완료수에서는 제외
        // 4) 주간 초과 수행 방지: 주 N회 구간 목표치까지만 공동 및 개인 기여로 인정
        // 5) 공동 목표 달성률과 각 참가자의 개인 기여 횟수(contributionCount) 분리 집계
        throw NotImplementedError("사용자 미션 3 구현 필요")
    }
}
