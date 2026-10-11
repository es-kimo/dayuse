package com.dayuse.domain.coin

import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.global.util.DateTimeUtils
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * [F05, F11] 코인 획득 권리 산정 및 상한 검증 계산기
 * - 과거 정책(수행 횟수×10 + 완주 20%, 챌린지당 300, 동시 3개) 폐기
 * - 계정 전체 인정 날짜당 최대 10코인
 * - 30일(300코인), 365일(3,650코인) 수행 날짜 기준 윈도우 상한 검증
 * - 기기 시계 및 EXIF 조작 배제, 서버 KST 접수 시각 기반 부정 적립 방어
 */
object CoinEligibilityCalculator {

    data class FilterResult(
        val validCandidates: List<CandidateVerification>,
        val rejectedDates: Map<LocalDate, CoinRejectionReason>
    )

    data class DailyCapResult(
        val newCandidateDates: List<LocalDate>,
        val cappedDates: Set<LocalDate>,
        val alreadyGrantedRejections: Map<LocalDate, CoinRejectionReason>
    )

    data class WindowCapResult(
        val eligibleDates: Set<LocalDate>,
        val windowCapRejections: Map<LocalDate, CoinRejectionReason>
    )

    /**
     * [미션 1] 부정 적립 기초 방어 (F11, 5.3.7)
     * - 챌린지 정상 종료(CONFIRMED) 상태 검증
     * - 서버 KST 접수 시각 대비 미래 날짜 배제
     * - 계정 생성 전, 참가 효력 발생 전 날짜 배제
     * - 지각 인증 및 리데이 티켓 사용 건 배제
     */
    fun filterValidDates(
        context: ParticipantCoinContext,
        candidates: List<CandidateVerification>,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): FilterResult {
        // TODO [사용자 미션 1]: 부정 적립 기초 방어 (F11, 5.3.7)
        // 1. context.challengeStatus가 CONFIRMED가 아닌 경우 모든 후보를 CHALLENGE_NOT_CONFIRMED로 거절하고 emptyList() 반환
        // 2. 각 candidate에 대해 아래 조건 순차 검사 후 탈락 사유를 rejectedDates에 기록:
        //    - 미래 날짜 (targetDate > todayKst || targetDate > submittedDate || candidate.submittedAt > now) -> FUTURE_DATE
        //    - 계정 생성 이전 날짜 (targetDate < context.userCreatedAt.toLocalDate()) -> BEFORE_USER_CREATED
        //    - 참가 효력 발생 이전 날짜 (targetDate < context.participantStartDate) -> BEFORE_PARTICIPANT_JOINED
        //    - 지각 인증 (candidate.isLate) -> LATE_VERIFICATION
        //    - 리데이 티켓 적용 (candidate.isRedayApplied) -> REDAY_APPLIED
        // 3. 모든 조건을 통과한 후보만 validCandidates에 담아 FilterResult(validCandidates, rejectedDates)로 반환
        return FilterResult(emptyList(), emptyMap())
    }

    /**
     * [미션 2] 동일 날짜 10코인 캡 적용 및 중복 제거 (F05, 5.3.1, 5.3.2)
     * - 하루 여러 번 수행, 사진 여러 장, 병행 챌린지 등으로 중복 제출되어도 날짜당 1건만 인정
     * - 계정이 타 챌린지 또는 이전 지급을 통해 해당 날짜에 이미 10코인을 받았는지 대조
     */
    fun deduplicateAndCapDaily(
        validCandidates: List<CandidateVerification>,
        existingAwardedCoinsByDate: Map<LocalDate, Int>
    ): DailyCapResult {
        // TODO [사용자 미션 2]: 동일 날짜 10코인 캡 적용 및 중복 제거 (F05, 5.3.1, 5.3.2)
        // 1. validCandidates를 targetDate 기준으로 그룹화(또는 distinct)합니다.
        //    - 동일 날짜에 2건 이상 제출된 경우 cappedDates에 해당 날짜를 추가합니다.
        // 2. 각 날짜에 대해 existingAwardedCoinsByDate에 이미 10코인 이상 지급되었는지 확인합니다:
        //    - 이미 10코인 이상 지급된 경우: alreadyGrantedRejections에 ALREADY_GRANTED를 기록하고 cappedDates에 추가
        //    - 아직 10코인 미만인 경우: newCandidateDates에 추가
        // 3. newCandidateDates(정렬됨), cappedDates, alreadyGrantedRejections를 담아 DailyCapResult로 반환
        return DailyCapResult(emptyList(), emptySet(), emptyMap())
    }

    /**
     * [미션 3] 30일(300코인) / 365일(3,650코인) 수행일 기준 상한 검증 (F11, 5.3.3)
     * - 지급일이 아닌 '수행 대상 날짜' 기준 윈도우 누적 검증
     * - candidateDates를 포함하는 모든 슬라이딩 윈도우에서 최대 상한 초과 여부 확인
     */
    fun validateWindowCaps(
        candidateDates: List<LocalDate>,
        existingAwardedCoinsByDate: Map<LocalDate, Int>
    ): WindowCapResult {
        // TODO [사용자 미션 3]: 30일(300코인) / 365일(3,650코인) 수행일 기준 상한 검증 (F11, 5.3.3)
        // 1. candidateDates를 오름차순으로 정렬하여 순회합니다.
        // 2. runningCoinsByDate(기존 지급 코인 복사본)를 기준으로:
        //    - isExceedingWindowCap(targetDate, ..., WINDOW_30_DAYS, MAX_COINS_30_DAYS, DAILY_COIN_CAP) 확인
        //      -> 초과 시 windowCapRejections에 EXCEEDS_30_DAY_CAP 기록
        //    - isExceedingWindowCap(targetDate, ..., WINDOW_365_DAYS, MAX_COINS_365_DAYS, DAILY_COIN_CAP) 확인
        //      -> 초과 시 windowCapRejections에 EXCEEDS_365_DAY_CAP 기록
        //    - 통과 시 eligibleDates에 추가하고 runningCoinsByDate[targetDate]에 DAILY_COIN_CAP 누적
        // 3. WindowCapResult(eligibleDates, windowCapRejections) 반환
        return WindowCapResult(emptySet(), emptyMap())
    }

    /**
     * 특정 날짜(targetDate)를 포함하는 모든 연속된 windowDays 기간 내의 코인 합계가 maxCoins를 초과하는지 검사
     */
    fun isExceedingWindowCap(
        targetDate: LocalDate,
        currentCoinsByDate: Map<LocalDate, Int>,
        windowDays: Long,
        maxCoins: Int,
        coinsToAdd: Int
    ): Boolean {
        // TODO [사용자 미션 3-부속]: 특정 날짜를 포함하는 모든 연속된 windowDays 기간의 코인 합계가 maxCoins를 초과하는지 검사
        // 1. targetDate를 포함하는 슬라이딩 윈도우 [w, w + windowDays - 1]의 시작일 w 범위는 [targetDate - windowDays + 1 .. targetDate] (총 windowDays개 윈도우)
        // 2. 각 윈도우 구간 내에 존재하는 코인들의 합 + coinsToAdd가 maxCoins를 초과하면 true 반환
        // 3. 모든 윈도우에서 초과하지 않으면 false 반환
        return false
    }

    /**
     * 전체 코인 권리 및 상한 계산 파이프라인
     */
    fun calculate(
        context: ParticipantCoinContext,
        candidates: List<CandidateVerification>,
        existingAwardedCoinsByDate: Map<LocalDate, Int> = emptyMap(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CoinEligibilityResult {
        // 1. 기초 부정 적립 방어 필터링
        val filterResult = filterValidDates(context, candidates, now)

        // 2. 계정 단위 동일 날짜 중복 제거 및 10코인 캡 적용
        val dailyCapResult = deduplicateAndCapDaily(
            validCandidates = filterResult.validCandidates,
            existingAwardedCoinsByDate = existingAwardedCoinsByDate
        )

        // 3. 30일 / 365일 수행 날짜 윈도우 기준 누적 상한 검증
        val windowCapResult = validateWindowCaps(
            candidateDates = dailyCapResult.newCandidateDates,
            existingAwardedCoinsByDate = existingAwardedCoinsByDate
        )

        // 거절 사유 종합 (필터 탈락 + 기지급 캡 + 윈도우 상한 초과)
        val allRejections = mutableMapOf<LocalDate, CoinRejectionReason>()
        allRejections.putAll(filterResult.rejectedDates)
        allRejections.putAll(dailyCapResult.alreadyGrantedRejections)
        allRejections.putAll(windowCapResult.windowCapRejections)

        val awardedCoins = windowCapResult.eligibleDates.size * CoinPolicy.DAILY_COIN_CAP

        return CoinEligibilityResult(
            userId = context.userId,
            eligibleDates = windowCapResult.eligibleDates,
            awardedCoins = awardedCoins,
            cappedDates = dailyCapResult.cappedDates,
            rejectedDates = allRejections
        )
    }
}
