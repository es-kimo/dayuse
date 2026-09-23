package com.dayuse.domain.notification.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.notification.PushSendLog
import com.dayuse.domain.notification.PushSendLogRepository
import com.dayuse.domain.notification.UserNotificationSettingRepository
import com.dayuse.domain.notification.dto.PushPayload
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.global.util.DateTimeUtils
import org.slf4j.LoggerFactory
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.temporal.ChronoUnit

@Service
class NotificationSchedulerService(
    private val userNotificationSettingRepository: UserNotificationSettingRepository,
    private val pushSendLogRepository: PushSendLogRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val challengeRepository: ChallengeRepository,
    private val verificationRepository: VerificationRepository,
    private val notificationPushService: NotificationPushService
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun processScheduledNotifications(targetDateTime: LocalDateTime = DateTimeUtils.nowKst()) {
        val currentTime = targetDateTime.toLocalTime().truncatedTo(ChronoUnit.MINUTES)
        val today = targetDateTime.toLocalDate()

        log.debug("스케줄러 알림 발송 검사 시작: time={}, date={}", currentTime, today)

        // 1. 현재 시간에 알림 설정이 켜져 있는 사용자 목록 조회
        val targetSettings = userNotificationSettingRepository.findAllByEnabledTrueAndReminderTime(currentTime)
        if (targetSettings.isEmpty()) {
            return
        }

        for (setting in targetSettings) {
            val userId = setting.userId

            // TODO [사용자 미션 1-1]: 당일 1회 발송 보장 및 미인증 챌린지 발송 파이프라인을 완성하세요.
            // 1. pushSendLogRepository를 조회하여 오늘 이미 발송 이력이 있다면 알림을 스킵(continue)합니다.
            // 2. countPendingChallenges(userId, today)를 호출하여 오늘 미인증 대기 챌린지가 없으면(<= 0) 스킵합니다.
            // 3. 미인증 챌린지가 있는 경우 notificationPushService.sendPushToUser()를 호출하여 단 1건의 알림을 발송하고,
            //    pushSendLogRepository에 당일 발송 이력을 저장하세요. (DataIntegrityViolationException 동시성 충돌 방어 포함)
        }
    }

    fun countPendingChallenges(userId: Long, targetDate: LocalDate): Int {
        // TODO [사용자 미션 1-2]: 사용자가 활성 참여(ACTIVE) 중인 챌린지 중,
        // 오늘 수행 대상(participant.startDate <= targetDate <= challenge.endDate)이면서
        // 아직 오늘 인증(Verification)을 완료하지 않은 미인증 챌린지 건수를 집계하여 반환하세요.
        return 0
    }
}
