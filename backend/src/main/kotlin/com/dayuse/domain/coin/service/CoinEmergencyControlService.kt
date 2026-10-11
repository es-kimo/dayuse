package com.dayuse.domain.coin.service

import com.dayuse.domain.coin.dto.KillSwitchResponse
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import java.time.LocalDateTime
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

@Service
class CoinEmergencyControlService {
    private val log = LoggerFactory.getLogger(javaClass)

    private val killSwitchActive = AtomicBoolean(false)
    private val killSwitchReason = AtomicReference<String?>("정상 가동 중")
    private val lastUpdatedAt = AtomicReference<LocalDateTime>(LocalDateTime.now())

    /**
     * 비상 지급 중지 플래그(Kill switch) 활성화 여부
     */
    fun isKillSwitchActive(): Boolean = killSwitchActive.get()

    /**
     * 비상 지급 중지 플래그 설정/해제
     */
    fun setKillSwitch(active: Boolean, reason: String? = null, now: LocalDateTime = LocalDateTime.now()): KillSwitchResponse {
        val prev = killSwitchActive.getAndSet(active)
        killSwitchReason.set(reason ?: if (active) "관리자에 의한 비상 지급 중지" else "정상 가동 재개")
        lastUpdatedAt.set(now)

        log.warn("[CoinEmergencyControlService] Kill switch changed: prev=$prev, current=$active, reason=$reason")
        return getKillSwitchStatus()
    }

    /**
     * 현재 비상 제어 상태 조회
     */
    fun getKillSwitchStatus(): KillSwitchResponse = KillSwitchResponse(
        active = killSwitchActive.get(),
        reason = killSwitchReason.get(),
        updatedAt = lastUpdatedAt.get()
    )

    /**
     * 지급 대상 트랜잭션이 위험 보류(HOLD) 대상인지 판정
     * - 비상 킬스위치 활성화 시 신규 지급은 모두 보류 격리
     * - 비정상적 대량 코인 요구 시 격리
     */
    fun shouldHold(userId: Long, amount: Int): Boolean {
        if (killSwitchActive.get()) {
            return true
        }
        // 단일 회차 비정상 대량 지급 의심 (300코인 초과 등 정책 방어)
        if (amount > 300) {
            return true
        }
        return false
    }
}
