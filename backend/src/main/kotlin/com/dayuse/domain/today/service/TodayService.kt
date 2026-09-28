package com.dayuse.domain.today.service

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.PeriodType
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.today.dto.ChallengeTodayTodoResponse
import com.dayuse.domain.today.dto.TodayActionResponse
import com.dayuse.domain.today.dto.TodayPeriodInfo
import com.dayuse.domain.today.dto.TodayVerificationSummary
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.data.repository.findByIdOrNull
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate

@Service
@Transactional(readOnly = true)
class TodayService(
    private val groupMemberRepository: GroupMemberRepository,
    private val groupRepository: GroupRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val verificationRepository: VerificationRepository,
    private val presignedUrlService: PresignedUrlService,
    private val dailyRecordRepository: DailyRecordRepository? = null,
    private val userRepository: com.dayuse.domain.user.UserRepository? = null
) {

    fun getAllTodayActions(userId: Long): List<TodayActionResponse> {
        val today = DateTimeUtils.todayKst()
        val activeParticipants = challengeParticipantRepository.findAllByUserIdAndStatus(
            userId,
            com.dayuse.domain.challenge.ParticipantStatus.ACTIVE
        )

        return activeParticipants.mapNotNull { participant ->
            val challenge = challengeRepository.findByIdOrNull(participant.challengeId) ?: return@mapNotNull null
            // TODO [사용자 미션 2-1]: 중단(ABORTED)되었거나 진행 중(IN_PROGRESS)이 아닌 챌린지 필터링
            // 요구사항:
            // 1. challenge.isAborted() 이거나 대상 일자 기준 challenge.status(today) 가 IN_PROGRESS 가 아닌 경우 return@mapNotNull null 처리하세요.

            if (participant.startDate > today || today > challenge.endDate) {
                return@mapNotNull null
            }

            val group = groupRepository.findByIdOrNull(challenge.groupId)

            val verification = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                challengeId = challenge.id,
                userId = userId,
                targetDate = today
            )

            val isTogether = challenge.executionType.isTogether
            // TODO [사용자 미션 2-2]: 함께하기(TOGETHER) 챌린지의 당일 공동 인증 여부 및 실제 인증자 닉네임 바인딩
            // 요구사항:
            // 1. isTogether인 경우 verificationRepository.findAllByChallengeIdAndTargetDate(challenge.id, today)로 당일 인증을 조회하세요.
            // 2. 당일 인증이 존재하면 isCompleted는 true가 되고, userRepository를 통해 실제 인증자(userId)의 닉네임을 조회하여 todayVerifierNickname에 할당하세요.
            // 3. isJointlyCompleted는 isTogether && isCompleted 일 때 true입니다.
            // 4. effectiveVerification을 통해 summary에 인증 사진 및 정보가 노출되도록 구성하세요.
            val isCompleted = verification != null
            val todayVerifierNickname: String? = null
            val isJointlyCompleted = false

            val summary = verification?.let {
                TodayVerificationSummary(
                    id = it.id,
                    imageUrl = presignedUrlService.generatePresignedGetUrl(it.imageUrl, it.challengeId, it.userId),
                    comment = it.comment,
                    isLate = it.isLate,
                    createdAt = it.createdAt
                )
            }

            val periodInfo = buildPeriodInfo(challenge, participant, today, verification != null)

            TodayActionResponse(
                challengeId = challenge.id,
                challengeTitle = challenge.title,
                verificationCriteria = challenge.verificationCriteria,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                isCompletedToday = isCompleted,
                canVerify = verification == null,
                myVerification = summary,
                groupId = challenge.groupId,
                groupName = group?.name,
                periodType = challenge.periodType,
                periodInfo = periodInfo,
                executionType = challenge.executionType,
                todayVerifierNickname = todayVerifierNickname,
                isJointlyCompleted = isJointlyCompleted
            )
        }
    }

    fun getTodayActions(groupId: Long, userId: Long): List<TodayActionResponse> {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 오늘 할 일을 조회할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        val challenges = challengeRepository.findAllByGroupId(groupId)

        // 사용자가 활성 참여 중인 챌린지 및 참여 정보
        val participantsMap = challengeParticipantRepository.findAllByUserIdAndStatus(
            userId,
            com.dayuse.domain.challenge.ParticipantStatus.ACTIVE
        ).associateBy { it.challengeId }

        // 오늘 수행 대상인 챌린지 추출
        val activeParticipatingChallenges = challenges.filter { challenge ->
            // TODO [사용자 미션 2-1]: 중단(ABORTED)되었거나 진행 중(IN_PROGRESS)이 아닌 챌린지 필터링
            // 요구사항:
            // 1. challenge.isAborted() 이거나 대상 일자 기준 challenge.status(today) 가 IN_PROGRESS 가 아닌 경우 return@filter false 처리하세요.

            val participant = participantsMap[challenge.id] ?: return@filter false
            participant.startDate <= today && today <= challenge.endDate
        }

        return activeParticipatingChallenges.map { challenge ->
            val participant = participantsMap[challenge.id]!!
            val verification = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                challengeId = challenge.id,
                userId = userId,
                targetDate = today
            )

            val isTogether = challenge.executionType.isTogether
            // TODO [사용자 미션 2-2]: 함께하기(TOGETHER) 챌린지의 당일 공동 인증 여부 및 실제 인증자 닉네임 바인딩
            // 요구사항:
            // 1. isTogether인 경우 verificationRepository.findAllByChallengeIdAndTargetDate(challenge.id, today)로 당일 인증을 조회하세요.
            // 2. 당일 인증이 존재하면 isCompleted는 true가 되고, userRepository를 통해 실제 인증자(userId)의 닉네임을 조회하여 todayVerifierNickname에 할당하세요.
            // 3. isJointlyCompleted는 isTogether && isCompleted 일 때 true입니다.
            val isCompleted = verification != null
            val todayVerifierNickname: String? = null
            val isJointlyCompleted = false

            val summary = verification?.let {
                TodayVerificationSummary(
                    id = it.id,
                    imageUrl = presignedUrlService.generatePresignedGetUrl(it.imageUrl, it.challengeId, it.userId),
                    comment = it.comment,
                    isLate = it.isLate,
                    createdAt = it.createdAt
                )
            }

            val periodInfo = buildPeriodInfo(challenge, participant, today, verification != null)

            TodayActionResponse(
                challengeId = challenge.id,
                challengeTitle = challenge.title,
                verificationCriteria = challenge.verificationCriteria,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                isCompletedToday = isCompleted,
                canVerify = verification == null,
                myVerification = summary,
                groupId = challenge.groupId,
                periodType = challenge.periodType,
                periodInfo = periodInfo,
                executionType = challenge.executionType,
                todayVerifierNickname = todayVerifierNickname,
                isJointlyCompleted = isJointlyCompleted
            )
        }
    }

    fun getChallengeTodayTodo(
        groupId: Long,
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeTodayTodoResponse {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 오늘 할 일을 조회할 수 있습니다.")
        }
        val challenge = challengeRepository.findByIdOrNull(challengeId)
            ?: throw ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")

        if (challenge.groupId != groupId) {
            throw BadRequestException("해당 모임의 챌린지가 아닙니다.")
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserIdAndStatus(
            challengeId,
            userId,
            com.dayuse.domain.challenge.ParticipantStatus.ACTIVE
        ) ?: throw ForbiddenException("해당 챌린지의 참여자가 아닙니다.")

        val todayVerified = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
            challengeId = challenge.id,
            userId = userId,
            targetDate = today
        ) != null

        val periodInfo = buildPeriodInfo(challenge, participant, today, todayVerified)
        return ChallengeTodayTodoResponse(
            periodType = challenge.periodType,
            periodInfo = periodInfo
        )
    }

    private fun buildPeriodInfo(
        challenge: Challenge,
        participant: ChallengeParticipant,
        today: LocalDate,
        todayVerified: Boolean
    ): TodayPeriodInfo? {
        if (challenge.periodType != PeriodType.WEEKLY_N) return null

        val completedDates = if (challenge.executionType.isTogether) {
            verificationRepository.findDistinctTargetDatesByChallengeId(challenge.id).toSet()
        } else {
            val allRecords = dailyRecordRepository?.findAllByChallengeParticipantId(participant.id).orEmpty()
            allRecords.filter { it.status == DailyRecordStatus.COMPLETED && it.verificationId != null }.map { it.date }.toSet()
        }

        val calc = ChallengePeriodCalculator.calculate(
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            participantStartDate = participant.startDate,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            completedDates = completedDates,
            today = today,
            executionType = challenge.executionType
        )

        val cur = calc.currentPeriod ?: return null
        val summaryText = if (challenge.executionType.isTogether) {
            "이번 구간 공동 ${cur.completedCount}/${cur.targetCount}회 · ${cur.startDate.monthValue}월 ${cur.startDate.dayOfMonth}일~${cur.endDate.monthValue}월 ${cur.endDate.dayOfMonth}일"
        } else {
            "이번 구간 ${cur.completedCount}/${cur.targetCount}회 · ${cur.startDate.monthValue}월 ${cur.startDate.dayOfMonth}일~${cur.endDate.monthValue}월 ${cur.endDate.dayOfMonth}일"
        }

        return TodayPeriodInfo(
            index = cur.index,
            startDate = cur.startDate,
            endDate = cur.endDate,
            targetCount = cur.targetCount,
            completedCount = cur.completedCount,
            todayVerified = todayVerified,
            isGoalAchieved = cur.isAchieved,
            summaryText = summaryText
        )
    }
}
