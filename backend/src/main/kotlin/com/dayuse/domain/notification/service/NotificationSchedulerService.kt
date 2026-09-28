package com.dayuse.domain.notification.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
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

            // TODO [사용자 미션 1-1]: 발송 직전 공동 완료 및 중단 여부 2차 검증 (레이스 컨디션 방어)
            // 요구사항:
            // 1. 발송 대기 중인 상태에서 타 참가자가 당일 공동 인증을 완료했거나 챌린지가 중단되었을 수 있습니다.
            // 2. 푸시 발송(notificationPushService.sendPushToUser) 직전에 countPendingChallenges를 재호출하여
            //    남은 미인증 챌린지가 0개 이하인 경우 발송을 건너뛰고 continue 처리하세요.

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

            // TODO [사용자 미션 1-2]: 중단(ABORTED) 및 진행 중(IN_PROGRESS)이 아닌 챌린지 필터링
            // 요구사항:
            // 1. challenge.isAborted() 이거나 대상 날짜 기준 challenge.status(targetDate) 가 IN_PROGRESS 가 아닌 경우 건너뛰세요.

            if (participant.startDate <= targetDate && targetDate <= challenge.endDate) {
                val isTogether = challenge.executionType.isTogether
                val hasVerified = if (isTogether) {
                    verificationRepository.existsByChallengeIdAndTargetDate(challenge.id, targetDate)
                } else {
                    verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                        challengeId = challenge.id,
                        userId = userId,
                        targetDate = targetDate
                    ) != null
                }

                if (!hasVerified) {
                    if (challenge.periodType == PeriodType.DAILY) {
                        pendingCount++
                    } else if (challenge.periodType == PeriodType.WEEKLY_N) {
                        val completedDates = if (isTogether) {
                            verificationRepository.findDistinctTargetDatesByChallengeId(challenge.id).toSet()
                        } else {
                            dailyRecordRepository?.findAllByChallengeParticipantId(participant.id)
                                ?.filter { it.status == com.dayuse.domain.dailyrecord.DailyRecordStatus.COMPLETED && it.verificationId != null }
                                ?.map { it.date }
                                ?.toSet() ?: emptySet()
                        }

                        val calc = ChallengePeriodCalculator.calculate(
                            challengeStartDate = challenge.startDate,
                            challengeEndDate = challenge.endDate,
                            participantStartDate = participant.startDate,
                            periodType = challenge.periodType,
                            targetFrequency = challenge.targetFrequency,
                            completedDates = completedDates,
                            today = targetDate,
                            executionType = challenge.executionType
                        )

                        val curPeriod = calc.currentPeriod
                        if (curPeriod != null && !curPeriod.isAchieved) {
                            pendingCount++
                        }
                    }
                }
            }
        }

        return pendingCount
    }
}
