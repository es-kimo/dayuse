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
    private val notificationPushService: NotificationPushService,
    private val dailyRecordRepository: com.dayuse.domain.dailyrecord.DailyRecordRepository? = null
) {
    private val log = LoggerFactory.getLogger(javaClass)

    @Transactional
    fun processScheduledNotifications(targetDateTime: LocalDateTime = DateTimeUtils.nowKst()) {
        val currentTime = targetDateTime.toLocalTime().truncatedTo(ChronoUnit.MINUTES)
        val today = targetDateTime.toLocalDate()

        log.debug(
            "스케줄러 알림 발송 검사 시작: time={}, date={}",
            currentTime,
            today
        )

        // 1. 현재 시간에 알림 설정이 켜져 있는 사용자 목록 조회
        val targetSettings = userNotificationSettingRepository.findAllByEnabledTrueAndReminderTime(currentTime)
        if (targetSettings.isEmpty()) {
            return
        }

        for (setting in targetSettings) {
            val userId = setting.userId

            if (pushSendLogRepository.existsByUserIdAndSendDate(
                    userId,
                    today
                )
            ) {
                log.debug(
                    "당일 이미 알림이 발송되어 스킵: userId={}, date={}",
                    userId,
                    today
                )
                continue
            }

            val pendingCount = countPendingChallenges(
                userId,
                today
            )
            if (pendingCount <= 0) {
                log.debug(
                    "미인증 챌린지가 없어 알림 발송 스킵: userId={}",
                    userId
                )
                continue
            }

            val payload = PushPayload(
                title = "dayuse 오늘 인증 리마인더",
                body = "오늘 인증할 챌린지가 ${pendingCount}개 남아 있어요! 잊지 말고 인증해 주세요.",
                url = "/today",
                tag = "dayuse-daily-reminder"
            )

            try {
                notificationPushService.sendPushToUser(
                    userId,
                    payload
                )

                pushSendLogRepository.save(
                    PushSendLog(
                        userId = userId,
                        sendDate = today,
                        pendingChallengeCount = pendingCount,
                        sentAt = targetDateTime
                    )
                )
                log.info(
                    "미인증 웹 푸시 발송 완료: userId={}, pendingCount={}, date={}",
                    userId,
                    pendingCount,
                    today
                )
            } catch (e: DataIntegrityViolationException) {
                log.warn(
                    "동시성 중복 발송 방어 (PushSendLog 유니크 충돌): userId={}, date={}",
                    userId,
                    today
                )
            } catch (e: Exception) {
                log.error(
                    "알림 발송 처리 중 예외 발생: userId={}",
                    userId,
                    e
                )
            }
        }
    }

    fun countPendingChallenges(
        userId: Long,
        targetDate: LocalDate
    ): Int {
        val activeParticipants = challengeParticipantRepository.findAllByUserIdAndStatus(
            userId,
            ParticipantStatus.ACTIVE
        )

        var pendingCount = 0
        for (participant in activeParticipants) {
            val challenge = challengeRepository.findByIdOrNull(participant.challengeId) ?: continue

            if (participant.startDate <= targetDate && targetDate <= challenge.endDate) {
                val hasVerified = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                    challengeId = challenge.id,
                    userId = userId,
                    targetDate = targetDate
                ) != null

                if (!hasVerified) {
                    if (challenge.periodType == com.dayuse.domain.challenge.PeriodType.DAILY) {
                        pendingCount++
                    } else if (challenge.periodType == com.dayuse.domain.challenge.PeriodType.WEEKLY_N) {
                        // TODO [사용자 미션 3]: 주 N회 챌린지에 대한 웹 푸시 발송 여부 복합 판정
                        // 1. 당일 미인증이더라도, 이번 주간 구간(currentPeriod)의 목표(targetCount)를 이미 달성(isAchieved)했다면
                        //    알림 발송 대상에서 제외(pendingCount 증가 X)해야 합니다.
                        // 2. 당일 미인증이고 아직 이번 구간 목표를 달성하지 못했을 때만 pendingCount를 1 증가시키세요.
                        pendingCount++ // 임시: 주간 목표 달성 여부 무시하고 무조건 카운트
                    }
                }
            }
        }

        return pendingCount
    }
}
