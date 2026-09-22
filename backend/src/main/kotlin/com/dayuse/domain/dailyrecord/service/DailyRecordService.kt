package com.dayuse.domain.dailyrecord.service

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.dailyrecord.dto.CalendarDailyRecordItem
import com.dayuse.domain.dailyrecord.dto.ChallengeCalendarResponse
import com.dayuse.domain.dailyrecord.dto.DailyRecordDetailResponse
import com.dayuse.domain.dailyrecord.dto.LateVerificationRequest
import com.dayuse.domain.dailyrecord.dto.ParticipantCalendarItem
import com.dayuse.domain.dailyrecord.dto.StatusSummaryResponse
import com.dayuse.domain.dailyrecord.dto.UncheckedRecordResponse
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.VerificationDetailResponse
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Transactional
class DailyRecordService(
    private val dailyRecordRepository: DailyRecordRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository,
    private val verificationRepository: VerificationRepository,
    private val presignedUrlService: PresignedUrlService
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

    @Transactional(readOnly = true)
    fun getStatusSummary(
        groupId: Long,
        userId: Long
    ): StatusSummaryResponse {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 상태 요약을 조회할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        val uncheckedCount = dailyRecordRepository.countUncheckedRecords(
            userId,
            groupId,
            today
        )
        val unpaidPenaltyAmount = dailyRecordRepository.calculateUnpaidPenaltyAmount(
            userId,
            groupId
        )

        return StatusSummaryResponse(
            groupId = groupId,
            uncheckedCount = uncheckedCount,
            unpaidPenaltyAmount = unpaidPenaltyAmount
        )
    }

    @Transactional(readOnly = true)
    fun getUncheckedRecords(
        groupId: Long,
        userId: Long
    ): List<UncheckedRecordResponse> {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 미확인 기록을 조회할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
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
            UncheckedRecordResponse(
                id = record.id,
                challengeId = record.challengeId,
                challengeTitle = challenge?.title ?: "알 수 없는 챌린지",
                date = record.date,
                status = effectiveStatus,
                penaltyAmount = participant?.penaltyAmount ?: 0,
                verificationCriteria = challenge?.verificationCriteria ?: ""
            )
        }
    }

    @Transactional(readOnly = true)
    fun getChallengeCalendar(
        challengeId: Long,
        userId: Long
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

        val today = DateTimeUtils.todayKst()
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
                    val effectiveStatus = record.currentStatus(today)

                    CalendarDailyRecordItem(
                        id = record.id,
                        date = record.date,
                        status = effectiveStatus,
                        penaltyAmount = record.penaltyAmount,
                        depositStatus = record.depositStatus,
                        isLate = record.isLate,
                        verificationId = record.verificationId,
                        imageUrl = imageUrl,
                        comment = verification?.comment
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
            participants = participantCalendarItems
        )
    }

    fun markFailed(
        recordId: Long,
        userId: Long
    ): DailyRecordDetailResponse {
        val record = dailyRecordRepository.findById(recordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        if (record.userId != userId) {
            throw ForbiddenException("본인의 일일 기록만 미수행으로 확정할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        val participant = challengeParticipantRepository.findById(record.challengeParticipantId)
            .orElseThrow { ResourceNotFoundException("챌린지 참여 정보를 찾을 수 없습니다.") }

        record.markFailed(participant.penaltyAmount, today)

        return toDetailResponse(record)
    }

    fun verifyLate(
        recordId: Long,
        userId: Long,
        request: LateVerificationRequest
    ): VerificationDetailResponse {
        val record = dailyRecordRepository.findById(recordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        if (record.userId != userId) {
            throw ForbiddenException("본인의 일일 기록만 늦은 인증을 등록할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        record.validateLateVerification(today)

        presignedUrlService.validateImageOwnership(
            request.imageUrl,
            record.challengeId,
            userId
        )

        val isLate = DateTimeUtils.isLateVerification(record.date)

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
            savedVerification.id,
            isLate = isLate,
            today = today
        )

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
            updatedAt = savedVerification.updatedAt
        )
    }

    fun onVerificationCreated(verification: Verification) {
        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(
            verification.challengeId,
            verification.userId
        ) ?: return

        val challenge = challengeRepository.findById(verification.challengeId).orElse(null) ?: return
        val today = DateTimeUtils.todayKst()
        ensureDailyRecordsForParticipant(
            participant,
            challenge,
            today
        )

        val record = dailyRecordRepository.findByChallengeParticipantIdAndDate(
            participant.id,
            verification.targetDate
        )

        record?.let {
            if (it.status != DailyRecordStatus.COMPLETED) {
                if (verification.targetDate < today) {
                    it.verifyLate(
                        verification.id,
                        isLate = verification.isLate,
                        today = today
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
            failedAt = record.failedAt
        )
    }
}
