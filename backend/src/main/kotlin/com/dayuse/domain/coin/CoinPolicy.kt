package com.dayuse.domain.coin

import com.dayuse.domain.challenge.result.ChallengeResultStatus
import com.dayuse.global.util.DateTimeUtils
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * 코인 발행 정책 기준 상수 (PRD 5.3)
 * - 폐기: 수행 횟수×10 + 완주 20%, 챌린지당 300코인, 동시 보상 3개 제한
 * - 적용: 계정 전체 인정 날짜당 최대 10코인
 * - 30일 상한: 300코인 (수행 대상 날짜 기준 윈도우)
 * - 365일 상한: 3,650코인 (수행 대상 날짜 기준 윈도우)
 */
object CoinPolicy {
    const val DAILY_COIN_CAP: Int = 10
    const val WINDOW_30_DAYS: Long = 30L
    const val MAX_COINS_30_DAYS: Int = 300
    const val WINDOW_365_DAYS: Long = 365L
    const val MAX_COINS_365_DAYS: Int = 3650
}

/**
 * 코인 지급 자격 탈락 사유 (F11, 5.3.7)
 */
enum class CoinRejectionReason(val description: String) {
    CHALLENGE_NOT_CONFIRMED("정상 종료(확정)되지 않은 챌린지입니다."),
    FUTURE_DATE("서버 KST 접수 시각 또는 현재 시각 기준 미래 날짜 인증입니다."),
    BEFORE_USER_CREATED("계정 생성 이전 날짜의 인증입니다."),
    BEFORE_PARTICIPANT_JOINED("챌린지 참가 효력 발생 이전 날짜의 인증입니다."),
    LATE_VERIFICATION("지각 인증은 코인 지급 대상에서 제외됩니다."),
    REDAY_APPLIED("리데이 티켓이 적용된 인증은 코인 지급 대상에서 제외됩니다."),
    ALREADY_GRANTED("해당 날짜에 이미 최대 10코인이 기지급되었습니다."),
    EXCEEDS_30_DAY_CAP("30일 수행 윈도우 기준 상한(300코인)을 초과했습니다."),
    EXCEEDS_365_DAY_CAP("365일 수행 윈도우 기준 상한(3,650코인)을 초과했습니다.")
}

/**
 * 코인 판정을 위한 후보 인증 DTO
 */
data class CandidateVerification(
    val verificationId: Long = 0L,
    val targetDate: LocalDate,
    val submittedAt: LocalDateTime,
    val isLate: Boolean = false,
    val isRedayApplied: Boolean = false
)

/**
 * 사용자별 챌린지 참가 자격 컨텍스트
 */
data class ParticipantCoinContext(
    val userId: Long,
    val userCreatedAt: LocalDateTime,
    val participantStartDate: LocalDate,
    val challengeStatus: ChallengeResultStatus = ChallengeResultStatus.CONFIRMED
)

/**
 * 코인 권리 및 상한 계산 최종 결과
 */
data class CoinEligibilityResult(
    val userId: Long,
    val eligibleDates: Set<LocalDate>,
    val awardedCoins: Int,
    val cappedDates: Set<LocalDate>,
    val rejectedDates: Map<LocalDate, CoinRejectionReason>
)
