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
        val rejectedDates = mutableMapOf<LocalDate, CoinRejectionReason>()
        val todayKst = now.toLocalDate()

        if (context.challengeStatus != ChallengeResultStatus.CONFIRMED) {
            candidates.forEach { candidate ->
                rejectedDates.putIfAbsent(candidate.targetDate, CoinRejectionReason.CHALLENGE_NOT_CONFIRMED)
            }
            return FilterResult(emptyList(), rejectedDates)
        }

        val validCandidates = mutableListOf<CandidateVerification>()

        for (candidate in candidates) {
            val targetDate = candidate.targetDate
            val submittedDate = candidate.submittedAt.toLocalDate()

            when {
                // 미래 날짜 방어 (기기 시계 조작 배제, 서버 KST 접수 시각 기준)
                targetDate > todayKst || targetDate > submittedDate || candidate.submittedAt > now -> {
                    rejectedDates.putIfAbsent(targetDate, CoinRejectionReason.FUTURE_DATE)
                }
                // 계정 생성 이전 날짜 방어
                targetDate < context.userCreatedAt.toLocalDate() -> {
                    rejectedDates.putIfAbsent(targetDate, CoinRejectionReason.BEFORE_USER_CREATED)
                }
                // 참가 효력 발생 이전 날짜 방어
                targetDate < context.participantStartDate -> {
                    rejectedDates.putIfAbsent(targetDate, CoinRejectionReason.BEFORE_PARTICIPANT_JOINED)
                }
                // 지각 인증 배제 (코인 발행 불가)
                candidate.isLate -> {
                    rejectedDates.putIfAbsent(targetDate, CoinRejectionReason.LATE_VERIFICATION)
                }
                // 리데이 티켓 적용 건 배제
                candidate.isRedayApplied -> {
                    rejectedDates.putIfAbsent(targetDate, CoinRejectionReason.REDAY_APPLIED)
                }
                else -> {
                    validCandidates.add(candidate)
                }
            }
        }

        return FilterResult(validCandidates, rejectedDates)
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
        val cappedDates = mutableSetOf<LocalDate>()
        val alreadyGrantedRejections = mutableMapOf<LocalDate, CoinRejectionReason>()
        val newCandidateDates = mutableListOf<LocalDate>()

        // 날짜별 그룹화하여 최초 1건만 후보로 취합하고, 동일 날짜 중복 제출 건은 캡(중복) 처리
        val groupedByDate = validCandidates.groupBy { it.targetDate }

        for ((date, submissions) in groupedByDate) {
            if (submissions.size > 1) {
                cappedDates.add(date)
            }

            val existingCoins = existingAwardedCoinsByDate[date] ?: 0
            if (existingCoins >= CoinPolicy.DAILY_COIN_CAP) {
                alreadyGrantedRejections[date] = CoinRejectionReason.ALREADY_GRANTED
                cappedDates.add(date)
            } else {
                newCandidateDates.add(date)
            }
        }

        return DailyCapResult(
            newCandidateDates = newCandidateDates.sorted(),
            cappedDates = cappedDates,
            alreadyGrantedRejections = alreadyGrantedRejections
        )
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
        val eligibleDates = mutableSetOf<LocalDate>()
        val windowCapRejections = mutableMapOf<LocalDate, CoinRejectionReason>()
        val runningCoinsByDate = existingAwardedCoinsByDate.toMutableMap()

        for (targetDate in candidateDates.sorted()) {
            val exceeds30Days = isExceedingWindowCap(
                targetDate = targetDate,
                currentCoinsByDate = runningCoinsByDate,
                windowDays = CoinPolicy.WINDOW_30_DAYS,
                maxCoins = CoinPolicy.MAX_COINS_30_DAYS,
                coinsToAdd = CoinPolicy.DAILY_COIN_CAP
            )

            if (exceeds30Days) {
                windowCapRejections[targetDate] = CoinRejectionReason.EXCEEDS_30_DAY_CAP
                continue
            }

            val exceeds365Days = isExceedingWindowCap(
                targetDate = targetDate,
                currentCoinsByDate = runningCoinsByDate,
                windowDays = CoinPolicy.WINDOW_365_DAYS,
                maxCoins = CoinPolicy.MAX_COINS_365_DAYS,
                coinsToAdd = CoinPolicy.DAILY_COIN_CAP
            )

            if (exceeds365Days) {
                windowCapRejections[targetDate] = CoinRejectionReason.EXCEEDS_365_DAY_CAP
                continue
            }

            eligibleDates.add(targetDate)
            runningCoinsByDate[targetDate] = (runningCoinsByDate[targetDate] ?: 0) + CoinPolicy.DAILY_COIN_CAP
        }

        return WindowCapResult(
            eligibleDates = eligibleDates,
            windowCapRejections = windowCapRejections
        )
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
        // targetDate를 포함하는 윈도우 [w, w + windowDays - 1]의 시작일 w 범위: [targetDate - windowDays + 1, targetDate]
        val earliestWindowStart = targetDate.minusDays(windowDays - 1)

        // 관심 구간 내의 코인 데이터만 필터링하여 불필요한 반복 최소화
        val relevantCoins = currentCoinsByDate.filter { (date, _) ->
            date in earliestWindowStart..targetDate.plusDays(windowDays - 1)
        }

        for (offset in 0 until windowDays) {
            val windowStart = earliestWindowStart.plusDays(offset)
            val windowEnd = windowStart.plusDays(windowDays - 1)

            var windowSum = coinsToAdd
            for ((date, coins) in relevantCoins) {
                if (date in windowStart..windowEnd) {
                    windowSum += coins
                }
            }

            if (windowSum > maxCoins) {
                return true
            }
        }

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
