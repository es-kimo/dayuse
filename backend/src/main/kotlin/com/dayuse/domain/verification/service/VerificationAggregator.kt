package com.dayuse.domain.verification.service

import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Component
@Transactional(readOnly = true)
class VerificationAggregator(
    private val verificationRepository: VerificationRepository
) {
    /**
     * 특정 날짜에 해당 챌린지의 유효한 인증이 1건 이상 존재하는지 확인합니다.
     */
    fun isDateCompleted(challengeId: Long, targetDate: LocalDate): Boolean {
        // TODO [사용자 미션 2-1]: 해당 날짜에 해당 챌린지의 인증이 1건 이상 존재하는지 확인하는 쿼리를 호출하세요.
        return false
    }

    /**
     * 특정 날짜에 등록된 인증 건수를 반환합니다.
     */
    fun countVerificationsOnDate(challengeId: Long, targetDate: LocalDate): Long {
        return verificationRepository.countByChallengeIdAndTargetDate(challengeId, targetDate)
    }

    /**
     * 특정 날짜에 등록된 모든 인증 목록을 반환합니다.
     */
    fun findVerificationsOnDate(challengeId: Long, targetDate: LocalDate): List<Verification> {
        return verificationRepository.findAllByChallengeIdAndTargetDate(challengeId, targetDate)
    }

    /**
     * 챌린지 전체 기간 중 유효한 인증이 1건 이상 등록된 모든 날짜들의 집합을 반환합니다.
     * 동일 날짜에 다수의 인증이 있더라도 1일로 집계(Set)됩니다.
     */
    fun getCompletedDates(challengeId: Long): Set<LocalDate> {
        // TODO [사용자 미션 2-2]: 챌린지 전체 기간 중 유효한 인증이 1건 이상 등록된 모든 날짜들의 집합(Set)을 조회하여 반환하세요.
        return emptySet()
    }

    /**
     * 특정 기간 [startDate, endDate] 내에 인증이 등록된 날짜 집합을 반환합니다.
     */
    fun getCompletedDatesInPeriod(challengeId: Long, startDate: LocalDate, endDate: LocalDate): Set<LocalDate> {
        return verificationRepository.findDistinctTargetDatesByChallengeIdAndDateBetween(challengeId, startDate, endDate).toSet()
    }

    /**
     * 챌린지 전체 기간 중 공동 수행된 총 일수를 반환합니다.
     */
    fun countCompletedDays(challengeId: Long): Int {
        return getCompletedDates(challengeId).size
    }

    /**
     * 특정 기간 내 공동 수행된 일수를 반환합니다.
     */
    fun countCompletedDaysInPeriod(challengeId: Long, startDate: LocalDate, endDate: LocalDate): Int {
        return getCompletedDatesInPeriod(challengeId, startDate, endDate).size
    }
}
