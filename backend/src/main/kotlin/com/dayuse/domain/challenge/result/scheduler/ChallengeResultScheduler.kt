package com.dayuse.domain.challenge.result.scheduler

import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class ChallengeResultScheduler(
    private val challengeResultService: ChallengeResultService
) {
    private val log = LoggerFactory.getLogger(javaClass)

    /**
     * 매 정시 5분(예: 00:05, 09:05 KST)마다 종료된 챌린지 결과를 잠정/확정 처리합니다.
     */
    @Scheduled(cron = "0 5 * * * *", zone = "Asia/Seoul")
    fun runChallengeResultAggregation() {
        val now = DateTimeUtils.nowKst()
        log.info("[ChallengeResultScheduler] Starting challenge result aggregation at {}", now)
        try {
            val processed = challengeResultService.processEndedChallenges(now)
            log.info("[ChallengeResultScheduler] Finished aggregation. Processed count: {}", processed)
        } catch (e: Exception) {
            log.error("[ChallengeResultScheduler] Error occurred while aggregating challenge results", e)
        }
    }
}
