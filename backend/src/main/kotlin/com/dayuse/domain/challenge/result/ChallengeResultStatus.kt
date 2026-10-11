package com.dayuse.domain.challenge.result

enum class ChallengeResultStatus {
    PROVISIONAL, // 잠정 (운영 기간 종료 후 최종 인정 기한 도달 전)
    CONFIRMED,   // 확정 (최종 인정 기한 도달 후)
    ABORTED      // 중단 (운영 중 중단된 챌린지)
}
