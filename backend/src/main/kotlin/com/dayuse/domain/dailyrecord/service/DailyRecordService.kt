package com.dayuse.domain.dailyrecord.service

import com.dayuse.domain.analytics.service.RedayAnalyticsRecorder
import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.dailyrecord.RedayIneligibleReason
import com.dayuse.domain.dailyrecord.VerificationTimePhase
import com.dayuse.domain.dailyrecord.dto.CalendarDailyRecordItem
import com.dayuse.domain.dailyrecord.dto.ChallengeCalendarResponse
import com.dayuse.domain.dailyrecord.dto.DailyRecordDetailResponse
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.dto.ParticipantCalendarItem
import com.dayuse.domain.dailyrecord.dto.RedayEligibilityResponse
import com.dayuse.domain.dailyrecord.dto.StatusSummaryResponse
import com.dayuse.domain.dailyrecord.dto.UncheckedRecordResponse
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.VerificationDetailResponse
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime

@Service
@Transactional
class DailyRecordService(
    private val dailyRecordRepository: DailyRecordRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository,
    private val verificationRepository: VerificationRepository,
    private val presignedUrlService: PresignedUrlService,
    private val redayTicketRepository: RedayTicketRepository,
    private val redayAnalyticsRecorder: RedayAnalyticsRecorder,
    private val challengePeriodSettlementRepository: com.dayuse.domain.challenge.period.ChallengePeriodSettlementRepository? = null
) {

    fun ensureDailyRecordsForParticipant(
        participant: ChallengeParticipant,
        challenge: Challenge,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        if (participant.status != ParticipantStatus.ACTIVE) {
            return
        }

        val existingRecords = dailyRecordRepository.findAllByChallengeParticipantId(participant.id)
        val existingDates = existingRecords.map { it.date }.toSet()

        val effectiveStartDate =
            if (participant.startDate > challenge.startDate) participant.startDate else challenge.startDate

        val missingRecords = mutableListOf<DailyRecord>()
        var curDate = effectiveStartDate
        while (!curDate.isAfter(challenge.endDate)) {
            if (!existingDates.contains(curDate)) {
                val verification = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                    challengeId = challenge.id,
                    userId = participant.userId,
                    targetDate = curDate
                )

                val initialStatus = when {
                    verification != null -> DailyRecordStatus.COMPLETED
                    curDate > today -> DailyRecordStatus.PLANNED
                    curDate == today -> DailyRecordStatus.WAITING
                    else -> DailyRecordStatus.UNCHECKED
                }

                missingRecords.add(
                    DailyRecord(
                        groupId = challenge.groupId,
                        challengeId = challenge.id,
                        challengeParticipantId = participant.id,
                        userId = participant.userId,
                        date = curDate,
                        status = initialStatus,
                        penaltyAmount = 0,
                        depositStatus = DepositStatus.UNPAID,
                        verificationId = verification?.id,
                        isLate = verification?.isLate ?: false
                    )
                )
            }
            curDate = curDate.plusDays(1)
        }

        if (missingRecords.isNotEmpty()) {
            dailyRecordRepository.saveAll(missingRecords)
        }
    }

    fun ensureDailyRecordsForUserInGroup(
        groupId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        val challenges = challengeRepository.findAllByGroupId(groupId)
        for (challenge in challenges) {
            val participant = challengeParticipantRepository.findByChallengeIdAndUserId(
                challenge.id,
                userId
            )
            if (participant != null) {
                ensureDailyRecordsForParticipant(
                    participant,
                    challenge,
                    today
                )
            }
        }
    }

    /**
     * 모임 내 기한 만료된 보류 벌금(PENDING)을 확정(CONFIRMED) 상태로 전환합니다. (v0.11 F04)
     */
    fun confirmExpiredPendingPenaltiesInGroup(
        groupId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Int {
        val pendingRecords = dailyRecordRepository.findPendingRecordsByGroupId(groupId)
        if (pendingRecords.isEmpty()) return 0

        val challengeIds = pendingRecords.map { it.challengeId }.distinct()
        val challenges = challengeRepository.findAllById(challengeIds).associateBy { it.id }
        val participantIds = pendingRecords.map { it.challengeParticipantId }.distinct()
        val participants = challengeParticipantRepository.findAllById(participantIds).associateBy { it.id }

        var confirmedCount = 0
        for (record in pendingRecords) {
            val challenge = challenges[record.challengeId]
            if (challenge != null && challenge.isAborted() && record.date >= challenge.abortedAt!!.toLocalDate()) {
                continue
            }
            val participantPenalty = participants[record.challengeParticipantId]?.penaltyAmount ?: record.penaltyAmount
            if (record.confirmExpiredPendingPenalty(participantPenalty, now)) {
                confirmedCount++
            }
        }
        return confirmedCount
    }

    fun getStatusSummary(
        groupId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): StatusSummaryResponse {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 상태 요약을 조회할 수 있습니다.")
        }

        confirmExpiredPendingPenaltiesInGroup(groupId, now)

        val today = now.toLocalDate()
        val uncheckedCount = dailyRecordRepository.countUncheckedRecords(
            userId,
            groupId,
            today
        )
        val unpaidPenaltyAmount = dailyRecordRepository.calculateUnpaidPenaltyAmount(
            userId,
            groupId
        ) + (challengePeriodSettlementRepository?.calculateUnpaidPenaltyAmount(userId, groupId) ?: 0)
        val pendingPenaltyAmount = dailyRecordRepository.calculatePendingPenaltyAmount(
            userId,
            groupId,
            now
        )

        return StatusSummaryResponse(
            groupId = groupId,
            uncheckedCount = uncheckedCount,
            unpaidPenaltyAmount = unpaidPenaltyAmount,
            pendingPenaltyAmount = pendingPenaltyAmount,
            verifiedUserIds = verificationRepository.findAllByGroupIdAndTargetDate(groupId, today).map { it.userId }.distinct()
        )
    }

    @Transactional(readOnly = true)
    fun getUncheckedRecords(
        groupId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): List<UncheckedRecordResponse> {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 미확인 기록을 조회할 수 있습니다.")
        }

        val today = now.toLocalDate()
        val uncheckedRecords = dailyRecordRepository.findUncheckedRecords(
            userId,
            groupId,
            today
        )

        val challengeIds = uncheckedRecords.map { it.challengeId }.distinct()
        val challenges = challengeRepository.findAllById(challengeIds).associateBy { it.id }

        val participantIds = uncheckedRecords.map { it.challengeParticipantId }.distinct()
        val participants = challengeParticipantRepository.findAllById(participantIds).associateBy { it.id }

        return uncheckedRecords.map { record ->
            val challenge = challenges[record.challengeId]
            val participant = participants[record.challengeParticipantId]
            val effectiveStatus = record.currentStatus(today)
            val redayActive = challenge?.isRedayActive() == true && (participant?.penaltyAmount ?: 0) > 0
            val evalPenaltyStatus = record.evaluatePenaltyStatus(
                redayAllowed = redayActive,
                participantPenaltyAmount = participant?.penaltyAmount ?: 0,
                challengeAbortedAt = challenge?.abortedAt,
                now = now
            )
            UncheckedRecordResponse(
                id = record.id,
                challengeId = record.challengeId,
                challengeTitle = challenge?.title ?: "알 수 없는 챌린지",
                date = record.date,
                status = effectiveStatus,
                penaltyAmount = participant?.penaltyAmount ?: 0,
                verificationCriteria = challenge?.verificationCriteria ?: "",
                redayAllowed = redayActive,
                penaltyStatus = evalPenaltyStatus,
                redayDeadline = if (redayActive) record.effectiveRedayDeadline() else null
            )
        }
    }

    @Transactional(readOnly = true)
    fun getChallengeCalendar(
        challengeId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): ChallengeCalendarResponse {
        val challenge = challengeRepository.findById(challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }

        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 캘린더를 조회할 수 있습니다.")
        }

        val today = now.toLocalDate()
        val participants = challengeParticipantRepository.findAllByChallengeIdAndStatus(
            challengeId,
            ParticipantStatus.ACTIVE
        )

        val allRecords = dailyRecordRepository.findAllByChallengeId(challengeId)
        val recordsByParticipant = allRecords.groupBy { it.challengeParticipantId }

        val verificationIds = allRecords.mapNotNull { it.verificationId }.distinct()
        val verifications = verificationRepository.findAllById(verificationIds).associateBy { it.id }

        val userIds = participants.map { it.userId }.distinct()
        val users = userRepository.findAllById(userIds).associateBy { it.id }

        val participantCalendarItems = participants.map { participant ->
            val user = users[participant.userId]
            val redayActive = challenge.isRedayActive() && participant.penaltyAmount > 0
            val actualRecords = recordsByParticipant[participant.id].orEmpty()
                .sortedBy { it.date }
                .map { record ->
                    val verification = record.verificationId?.let { verifications[it] }
                    val imageUrl = verification?.let {
                        presignedUrlService.generatePresignedGetUrl(
                            it.imageUrl,
                            it.challengeId,
                            it.userId
                        )
                    }

                    // 자정 경과 동적 상태 평가
                    val effectiveStatus = if (challenge.isAborted() && record.date >= challenge.abortedAt!!.toLocalDate() && record.verificationId == null) {
                        DailyRecordStatus.PLANNED
                    } else {
                        record.currentStatus(today)
                    }

                    val evalPenaltyStatus = record.evaluatePenaltyStatus(
                        redayAllowed = redayActive,
                        participantPenaltyAmount = participant.penaltyAmount,
                        challengeAbortedAt = challenge.abortedAt,
                        now = now
                    )

                    CalendarDailyRecordItem(
                        id = record.id,
                        date = record.date,
                        status = effectiveStatus,
                        penaltyAmount = record.penaltyAmount,
                        depositStatus = record.depositStatus,
                        isLate = record.isLate,
                        verificationId = record.verificationId,
                        imageUrl = imageUrl,
                        comment = verification?.comment,
                        penaltyStatus = evalPenaltyStatus,
                        redayApplied = record.redayApplied,
                        redayAppliedAt = record.redayAppliedAt,
                        redayDeadline = if (redayActive) record.effectiveRedayDeadline() else null
                    )
                }

            val preRecords = mutableListOf<CalendarDailyRecordItem>()
            var preDate = challenge.startDate
            while (preDate < participant.startDate && !preDate.isAfter(challenge.endDate)) {
                preRecords.add(
                    CalendarDailyRecordItem(
                        id = 0L,
                        date = preDate,
                        status = DailyRecordStatus.NOT_PARTICIPATED,
                        penaltyAmount = 0,
                        depositStatus = DepositStatus.UNPAID,
                        isLate = false,
                        verificationId = null,
                        imageUrl = null,
                        comment = null
                    )
                )
                preDate = preDate.plusDays(1)
            }

            ParticipantCalendarItem(
                userId = participant.userId,
                nickname = user?.nickname ?: "탈퇴한 사용자",
                profileImageUrl = user?.profileImageUrl,
                records = preRecords + actualRecords
            )
        }

        return ChallengeCalendarResponse(
            challengeId = challenge.id,
            title = challenge.title,
            startDate = challenge.startDate,
            endDate = challenge.endDate,
            redayAllowed = challenge.isRedayActive(),
            participants = participantCalendarItems
        )
    }

    fun markFailed(
        recordId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): DailyRecordDetailResponse {
        val record = dailyRecordRepository.findById(recordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        if (record.userId != userId) {
            throw ForbiddenException("본인의 일일 기록만 미수행으로 확정할 수 있습니다.")
        }

        val challenge = challengeRepository.findById(record.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }
        if (challenge.executionType.isTogether) {
            throw BadRequestException("함께하기 챌린지는 미수행 확정을 진행하지 않습니다.")
        }
        if (challenge.isAborted()) {
            val abortDate = challenge.abortedAt!!.toLocalDate()
            if (record.date >= abortDate) {
                throw BadRequestException("중단된 챌린지의 진행 중 및 이후 기간은 미수행으로 확정할 수 없습니다.")
            }
        }

        val today = now.toLocalDate()
        val participant = challengeParticipantRepository.findById(record.challengeParticipantId)
            .orElseThrow { ResourceNotFoundException("챌린지 참여 정보를 찾을 수 없습니다.") }

        val redayActive = challenge.isRedayActive() && participant.penaltyAmount > 0
        record.markFailed(
            penalty = participant.penaltyAmount,
            today = today,
            redayAllowed = redayActive,
            now = now
        )

        return toDetailResponse(record)
    }

    fun verifyLate(
        recordId: Long,
        userId: Long,
        request: LateVerificationRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): VerificationDetailResponse {
        val record = dailyRecordRepository.findById(recordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        if (record.userId != userId) {
            throw ForbiddenException("본인의 일일 기록만 늦은 인증을 등록할 수 있습니다.")
        }

        val challenge = challengeRepository.findById(record.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }
        if (challenge.isAborted()) {
            throw BadRequestException("중단된 챌린지에는 인증을 등록할 수 없습니다.")
        }

        val today = now.toLocalDate()
        record.validateLateVerification(today)

        presignedUrlService.validateImageOwnership(
            request.imageUrl,
            record.challengeId,
            userId
        )

        val participant = challengeParticipantRepository.findById(record.challengeParticipantId)
            .orElseThrow { ResourceNotFoundException("챌린지 참여 정보를 찾을 수 없습니다.") }

        val redayActive = challenge.isRedayActive() && participant.penaltyAmount > 0
        val isLate = if (challenge.redayAllowed) {
            DateTimeUtils.evaluateVerificationPhase(record.date, now).isOverdue
        } else {
            DateTimeUtils.isLateVerification(record.date, now)
        }

        val verification = Verification(
            groupId = record.groupId,
            challengeId = record.challengeId,
            userId = userId,
            targetDate = record.date,
            imageUrl = request.imageUrl,
            comment = request.comment,
            isLate = isLate
        )
        val savedVerification = verificationRepository.save(verification)

        record.verifyLate(
            verificationId = savedVerification.id,
            isLate = isLate,
            today = today,
            redayAllowed = redayActive,
            penaltyAmountForOverdue = if (redayActive) participant.penaltyAmount else 0,
            submittedAt = now
        )

        val eligibility = evaluateRedayEligibilityInternal(
            record = record,
            challenge = challenge,
            participant = participant,
            requestUserId = userId,
            now = now
        )

        /*
         * F13: 지각 인증 완료와 리데이 제시를 분리해 기록한다.
         * - `late_certification_completed`: 실제로 지각(리데이 구간 이후) 인증이 등록된 경우에만.
         *   eventId를 verificationId로 고정해 같은 인증이 두 번 집계되지 않는다.
         * - `recovery_offered`: 그 기록에 리데이 사용 경로를 실제로 제시할 수 있을 때만.
         *   보유 티켓 수를 함께 실어 "보유 티켓 즉시 사용"과 "광고 시청 후 사용" 경로를 뒤에서 구분할 수 있게 한다.
         */
        if (isLate) {
            redayAnalyticsRecorder.lateCertificationCompleted(
                userId = userId,
                verificationId = savedVerification.id,
                dailyRecordId = record.id,
                challengeId = record.challengeId,
                penaltyAmount = record.penaltyAmount,
                redayEligible = eligibility.eligible
            )
        }
        if (eligibility.eligible) {
            redayAnalyticsRecorder.recoveryOffered(
                userId = userId,
                dailyRecordId = record.id,
                challengeId = record.challengeId,
                penaltyAmount = eligibility.penaltyAmount,
                availableTicketCount = redayTicketRepository.countByUserIdAndStatus(
                    userId,
                    RedayTicketStatus.AVAILABLE
                )
            )
        }

        return VerificationDetailResponse(
            id = savedVerification.id,
            groupId = savedVerification.groupId,
            challengeId = savedVerification.challengeId,
            userId = savedVerification.userId,
            targetDate = savedVerification.targetDate,
            imageUrl = presignedUrlService.generatePresignedGetUrl(
                savedVerification.imageUrl,
                savedVerification.challengeId,
                savedVerification.userId
            ),
            comment = savedVerification.comment,
            isLate = savedVerification.isLate,
            createdAt = savedVerification.createdAt,
            updatedAt = savedVerification.updatedAt,
            dailyRecordId = record.id,
            redayAllowed = redayActive,
            redayEligible = eligibility.eligible,
            redayDeadline = record.redayDeadline,
            penaltyStatus = record.penaltyStatus,
            penaltyAmount = record.penaltyAmount
        )
    }

    /**
     * 일일 기록(DailyRecord) ID 기준 리데이 가능 여부 및 사유 검증 (v0.11 F03)
     */
    @Transactional(readOnly = true)
    fun checkRedayEligibility(
        recordId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): RedayEligibilityResponse {
        val record = dailyRecordRepository.findById(recordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        if (record.userId != userId) {
            val isMember = groupMemberRepository.existsByGroupIdAndUserId(record.groupId, userId)
            if (!isMember) {
                throw ForbiddenException("본인의 기록만 리데이 가능 여부를 확인할 수 있습니다.")
            }
        }

        val challenge = challengeRepository.findById(record.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }

        val participant = challengeParticipantRepository.findById(record.challengeParticipantId)
            .orElseThrow { ResourceNotFoundException("챌린지 참여 정보를 찾을 수 없습니다.") }

        return evaluateRedayEligibilityInternal(
            record = record,
            challenge = challenge,
            participant = participant,
            requestUserId = userId,
            now = now
        )
    }

    /**
     * 인증(Verification) ID 기준 리데이 가능 여부 및 사유 검증 (v0.11 F03)
     */
    @Transactional(readOnly = true)
    fun checkRedayEligibilityByVerificationId(
        verificationId: Long,
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): RedayEligibilityResponse {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        if (verification.userId != userId) {
            val isMember = groupMemberRepository.existsByGroupIdAndUserId(verification.groupId, userId)
            if (!isMember) {
                throw ForbiddenException("본인의 인증 기록만 리데이 가능 여부를 확인할 수 있습니다.")
            }
        }

        val challenge = challengeRepository.findById(verification.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(
            verification.challengeId,
            verification.userId
        ) ?: throw ResourceNotFoundException("챌린지 참여 정보를 찾을 수 없습니다.")

        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant.id,
            verification.targetDate
        ) ?: throw ResourceNotFoundException("일일 기록을 찾을 수 없습니다.")

        return evaluateRedayEligibilityInternal(
            record = record,
            challenge = challenge,
            participant = participant,
            requestUserId = userId,
            now = now
        )
    }

    fun evaluateRedayEligibilityInternal(
        record: DailyRecord,
        challenge: Challenge,
        participant: ChallengeParticipant,
        requestUserId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): RedayEligibilityResponse {
        val deadline = record.effectiveRedayDeadline()
        val remainingSeconds = maxOf(0L, Duration.between(now, deadline).seconds)
        val timePhase = DateTimeUtils.evaluateVerificationPhase(record.date, now)
        val redayActive = challenge.isRedayActive() && participant.penaltyAmount > 0
        val evalPenaltyStatus = record.evaluatePenaltyStatus(
            redayAllowed = redayActive,
            participantPenaltyAmount = participant.penaltyAmount,
            challengeAbortedAt = challenge.abortedAt,
            now = now
        )

        val reason = when {
            record.userId != requestUserId -> RedayIneligibleReason.NOT_OWNER
            challenge.periodType != com.dayuse.domain.challenge.PeriodType.DAILY -> RedayIneligibleReason.WEEKLY_NOT_SUPPORTED
            challenge.executionType != com.dayuse.domain.challenge.ExecutionType.INDIVIDUAL -> RedayIneligibleReason.TOGETHER_NOT_SUPPORTED
            participant.penaltyAmount <= 0 -> RedayIneligibleReason.NO_PENALTY
            !challenge.redayAllowed -> RedayIneligibleReason.NOT_ALLOWED
            challenge.isAborted() -> RedayIneligibleReason.CHALLENGE_ABORTED
            record.redayApplied || record.penaltyStatus == PenaltyStatus.EXEMPTED -> RedayIneligibleReason.ALREADY_APPLIED
            record.isLocked() -> RedayIneligibleReason.ALREADY_SETTLED
            record.penaltyStatus == PenaltyStatus.CONFIRMED && now < deadline -> RedayIneligibleReason.ALREADY_CONFIRMED
            record.status != DailyRecordStatus.COMPLETED || record.verificationId == null -> RedayIneligibleReason.NOT_VERIFIED
            !record.isLate -> RedayIneligibleReason.NOT_OVERDUE
            now >= deadline -> RedayIneligibleReason.EXPIRED
            record.penaltyStatus == PenaltyStatus.CONFIRMED -> RedayIneligibleReason.ALREADY_CONFIRMED
            else -> RedayIneligibleReason.ELIGIBLE
        }

        val effectivePenalty = when (evalPenaltyStatus) {
            PenaltyStatus.EXEMPTED, PenaltyStatus.NONE -> 0
            else -> if (record.penaltyAmount > 0) record.penaltyAmount else participant.penaltyAmount
        }

        /*
         * F13: 기한 만료는 서버 판정 시점에만 기록한다.
         * eventId를 dailyRecordId로 고정했으므로 화면이 몇 번 재조회하더라도 기록 1건당 1회만 적재된다.
         */
        if (reason == RedayIneligibleReason.EXPIRED && record.userId == requestUserId) {
            redayAnalyticsRecorder.recoveryExpired(
                userId = requestUserId,
                dailyRecordId = record.id,
                challengeId = challenge.id,
                penaltyAmount = if (record.penaltyAmount > 0) record.penaltyAmount else participant.penaltyAmount
            )
        }

        return RedayEligibilityResponse(
            recordId = record.id,
            verificationId = record.verificationId,
            challengeId = challenge.id,
            targetDate = record.date,
            eligible = reason == RedayIneligibleReason.ELIGIBLE,
            reason = reason,
            reasonMessage = reason.message,
            redayAllowed = redayActive,
            timePhase = timePhase,
            penaltyAmount = effectivePenalty,
            penaltyStatus = evalPenaltyStatus,
            redayApplied = record.redayApplied,
            redayDeadline = deadline,
            remainingSeconds = remainingSeconds
        )
    }

    fun onVerificationCreated(
        verification: Verification,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(
            verification.challengeId,
            verification.userId
        ) ?: return

        val challenge = challengeRepository.findById(verification.challengeId).orElse(null) ?: return
        val today = now.toLocalDate()
        ensureDailyRecordsForParticipant(
            participant,
            challenge,
            today
        )

        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant.id,
            verification.targetDate
        )

        val redayActive = challenge.isRedayActive() && participant.penaltyAmount > 0

        record?.let {
            if (it.status != DailyRecordStatus.COMPLETED) {
                if (verification.targetDate < today) {
                    it.verifyLate(
                        verificationId = verification.id,
                        isLate = verification.isLate,
                        today = today,
                        redayAllowed = redayActive,
                        penaltyAmountForOverdue = if (redayActive) participant.penaltyAmount else 0,
                        submittedAt = now
                    )
                } else {
                    it.verifyToday(verification.id)
                }
            } else if (it.verificationId == null) {
                it.verifyToday(verification.id)
            }
        }
    }

    fun onVerificationDeleted(verification: Verification) {
        val today = DateTimeUtils.todayKst()
        val records = dailyRecordRepository.findAllByVerificationId(verification.id)
        if (records.isNotEmpty()) {
            for (record in records) {
                record.rollbackVerification(today)
            }
        } else {
            val participant = challengeParticipantRepository.findByChallengeIdAndUserId(
                verification.challengeId,
                verification.userId
            )
            if (participant != null) {
                val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
                    participant.id,
                    verification.targetDate
                )
                record?.rollbackVerification(today)
            }
        }
    }

    private fun toDetailResponse(record: DailyRecord): DailyRecordDetailResponse {
        return DailyRecordDetailResponse(
            id = record.id,
            groupId = record.groupId,
            challengeId = record.challengeId,
            challengeParticipantId = record.challengeParticipantId,
            userId = record.userId,
            date = record.date,
            status = record.status,
            penaltyAmount = record.penaltyAmount,
            depositStatus = record.depositStatus,
            verificationId = record.verificationId,
            isLate = record.isLate,
            failedAt = record.failedAt,
            penaltyStatus = record.penaltyStatus,
            redayApplied = record.redayApplied,
            redayAppliedAt = record.redayAppliedAt,
            redayDeadline = record.redayDeadline
        )
    }
}
