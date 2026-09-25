package com.dayuse.domain.challenge.service

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.challenge.dto.ChallengeDetailResponse
import com.dayuse.domain.challenge.dto.ChallengeParticipantResponse
import com.dayuse.domain.challenge.dto.ChallengePeriodIntervalDto
import com.dayuse.domain.challenge.dto.ChallengeRestartTemplateResponse
import com.dayuse.domain.challenge.dto.ChallengeSummaryResponse
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.CreateParticipantRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.JoinOptionDto
import com.dayuse.domain.challenge.dto.JoinPreviewResponse
import com.dayuse.domain.challenge.dto.RestartChallengeRequest
import com.dayuse.domain.challenge.dto.StartDateType
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
import com.dayuse.domain.challenge.period.ChallengePeriodCalculator
import com.dayuse.domain.challenge.period.ChallengePeriodInterval
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ChallengeAlreadyStartedException
import com.dayuse.global.exception.DuplicateResourceException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.Long

@Service
@Transactional(readOnly = true)
class ChallengeService(
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository,
    private val dailyRecordService: DailyRecordService? = null,
    private val dailyRecordRepository: DailyRecordRepository? = null
) {

    @Transactional
    fun createChallenge(
        groupId: Long,
        userId: Long,
        request: CreateChallengeRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeDetailResponse {
        groupMemberRepository.findByGroupIdAndUserId(
            groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 생성할 수 있습니다.")

        val group = groupRepository.findById(groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: $groupId)")
        }

        if (request.startDate < today) {
            throw BadRequestException("시작일은 오늘(KST) 이후 날짜여야 합니다.")
        }

        val calculatedEndDate = request.endDate ?: request.startDate.plusDays(13)
        if (calculatedEndDate < request.startDate) {
            throw BadRequestException("종료일은 시작일 이후여야 합니다.")
        }

        // 참가자 목록 정규화 및 검증
        val participantsList = if (request.participants.isNullOrEmpty()) {
            listOf(CreateParticipantRequest(userId = userId, penaltyAmount = request.myPenaltyAmount))
        } else {
            val userIds = request.participants.map { it.userId }
            if (userIds.size != userIds.toSet().size) {
                throw BadRequestException("중복된 참가자가 포함되어 있습니다.")
            }
            if (request.participants.none { it.userId == userId }) {
                request.participants + CreateParticipantRequest(userId = userId, penaltyAmount = request.myPenaltyAmount)
            } else {
                request.participants
            }
        }

        // 모임 멤버십 일괄 검증 (All-or-Nothing 무결성 보장)
        val targetUserIds = participantsList.map { it.userId }.toSet()
        val existingMembers = groupMemberRepository.findAllByGroupIdAndUserIdIn(groupId, targetUserIds)
        if (existingMembers.size != targetUserIds.size) {
            throw BadRequestException("모임에 속하지 않은 회원이 포함되어 있습니다.")
        }

        val challenge = challengeRepository.save(
            Challenge(
                groupId = groupId,
                creatorUserId = userId,
                title = request.title,
                description = request.description,
                verificationCriteria = request.verificationCriteria,
                startDate = request.startDate,
                endDate = calculatedEndDate,
                periodType = request.periodType,
                targetFrequency = request.targetFrequency
            )
        )

        // 복수 참가자 일괄 등록 및 데일리 레코드 초기화
        val savedParticipants = participantsList.map { participantReq ->
            challengeParticipantRepository.save(
                ChallengeParticipant(
                    challengeId = challenge.id,
                    userId = participantReq.userId,
                    penaltyAmount = participantReq.penaltyAmount,
                    startDate = challenge.startDate,
                    status = ParticipantStatus.ACTIVE
                )
            )
        }

        savedParticipants.forEach { participant ->
            dailyRecordService?.ensureDailyRecordsForParticipant(
                participant,
                challenge,
                today
            )
        }

        val usersById = userRepository.findAllById(targetUserIds).associateBy { it.id }
        val creatorUser = usersById[userId]
        val creatorParticipant = savedParticipants.first { it.userId == userId }

        val participantResponses = savedParticipants.map { participant ->
            val user = usersById[participant.userId]
            ChallengeParticipantResponse(
                id = participant.id,
                userId = participant.userId,
                nickname = user?.nickname ?: "참여자",
                profileImageUrl = user?.profileImageUrl,
                penaltyAmount = participant.penaltyAmount,
                startDate = participant.startDate,
                status = participant.status,
                completionRate = 0,
                joinedAt = participant.joinedAt,
                isCreator = participant.userId == userId
            )
        }

        val durationDays = ChronoUnit.DAYS.between(challenge.startDate, challenge.endDate).toInt() + 1
        val initCalc = ChallengePeriodCalculator.calculate(
            challenge.startDate,
            challenge.endDate,
            challenge.startDate,
            challenge.periodType,
            challenge.targetFrequency,
            emptySet(),
            today
        )

        return ChallengeDetailResponse(
            id = challenge.id,
            groupId = group.id,
            groupName = group.name,
            creatorUserId = userId,
            creatorNickname = creatorUser?.nickname ?: "생성자",
            title = challenge.title,
            description = challenge.description,
            verificationCriteria = challenge.verificationCriteria,
            startDate = challenge.startDate,
            endDate = challenge.endDate,
            durationDays = durationDays,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            totalTargetCount = initCalc.totalTargetCount,
            totalCompletedCount = 0,
            progressRate = 0,
            currentPeriod = initCalc.currentPeriod?.toDto(),
            status = challenge.status(today),
            isCreator = true,
            isParticipating = true,
            myPenaltyAmount = creatorParticipant.penaltyAmount,
            canJoin = false,
            canCancel = false,
            canDelete = challenge.canDelete(today),
            canModifyFull = challenge.canModifyFullConditions(today),
            participants = participantResponses
        )
    }

    fun getRestartTemplate(
        groupId: Long,
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeRestartTemplateResponse {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 다시 시작할 수 있습니다.")

        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (challenge.groupId != groupId) {
            throw BadRequestException("해당 모임의 챌린지가 아닙니다.")
        }

        if (!challenge.isEnded(today)) {
            throw BadRequestException("종료된 챌린지만 다시 시작할 수 있습니다.")
        }

        val durationDays = ChronoUnit.DAYS.between(challenge.startDate, challenge.endDate).toInt() + 1
        val suggestedStartDate = today.plusDays(1)
        val suggestedEndDate = suggestedStartDate.plusDays((durationDays - 1).toLong())

        // 이전 참여 벌금 금액 조회: 현재 챌린지 참여 이력 우선 -> 없으면 사용자의 가장 최근 참여 이력 -> 없으면 기본 5,000원
        val suggestedPenalty = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, userId)?.penaltyAmount
            ?: challengeParticipantRepository.findFirstByUserIdOrderByCreatedAtDesc(userId)?.penaltyAmount
            ?: 5000

        return ChallengeRestartTemplateResponse(
            challengeId = challenge.id,
            title = challenge.title,
            description = challenge.description,
            verificationCriteria = challenge.verificationCriteria,
            durationDays = durationDays,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            suggestedStartDate = suggestedStartDate,
            suggestedEndDate = suggestedEndDate,
            suggestedPenaltyAmount = suggestedPenalty
        )
    }

    @Transactional
    fun restartChallenge(
        groupId: Long,
        challengeId: Long,
        userId: Long,
        request: RestartChallengeRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeDetailResponse {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 다시 시작할 수 있습니다.")

        val group = groupRepository.findById(groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: $groupId)")
        }

        val sourceChallenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (sourceChallenge.groupId != groupId) {
            throw BadRequestException("해당 모임의 챌린지가 아닙니다.")
        }

        if (!sourceChallenge.isEnded(today)) {
            throw BadRequestException("종료된 챌린지만 다시 시작할 수 있습니다.")
        }

        val calculatedEndDate = request.endDate ?: run {
            val originalDuration = ChronoUnit.DAYS.between(sourceChallenge.startDate, sourceChallenge.endDate)
            request.startDate.plusDays(originalDuration)
        }

        val newChallenge = Challenge.recreateFrom(
            source = sourceChallenge,
            newStartDate = request.startDate,
            newEndDate = calculatedEndDate,
            creatorUserId = userId,
            newTitle = request.title,
            newDescription = request.description,
            newVerificationCriteria = request.verificationCriteria,
            newPeriodType = request.periodType,
            newTargetFrequency = request.targetFrequency,
            today = today
        )
        val savedChallenge = challengeRepository.save(newChallenge)

        val creatorParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = savedChallenge.id,
                userId = userId,
                penaltyAmount = request.myPenaltyAmount,
                startDate = savedChallenge.startDate,
                status = ParticipantStatus.ACTIVE
            )
        )
        dailyRecordService?.ensureDailyRecordsForParticipant(
            creatorParticipant,
            savedChallenge,
            today
        )

        val creatorUser = userRepository.findById(userId).orElse(null)
        val participantResponse = ChallengeParticipantResponse(
            id = creatorParticipant.id,
            userId = userId,
            nickname = creatorUser?.nickname ?: "참여자",
            profileImageUrl = creatorUser?.profileImageUrl,
            penaltyAmount = creatorParticipant.penaltyAmount,
            startDate = creatorParticipant.startDate,
            status = creatorParticipant.status,
            completionRate = 0,
            joinedAt = creatorParticipant.joinedAt,
            isCreator = true
        )

        val durationDays = ChronoUnit.DAYS.between(savedChallenge.startDate, savedChallenge.endDate).toInt() + 1
        val initCalc = ChallengePeriodCalculator.calculate(
            savedChallenge.startDate,
            savedChallenge.endDate,
            savedChallenge.startDate,
            savedChallenge.periodType,
            savedChallenge.targetFrequency,
            emptySet(),
            today
        )

        return ChallengeDetailResponse(
            id = savedChallenge.id,
            groupId = group.id,
            groupName = group.name,
            creatorUserId = userId,
            creatorNickname = creatorUser?.nickname ?: "생성자",
            title = savedChallenge.title,
            description = savedChallenge.description,
            verificationCriteria = savedChallenge.verificationCriteria,
            startDate = savedChallenge.startDate,
            endDate = savedChallenge.endDate,
            durationDays = durationDays,
            periodType = savedChallenge.periodType,
            targetFrequency = savedChallenge.targetFrequency,
            totalTargetCount = initCalc.totalTargetCount,
            totalCompletedCount = 0,
            progressRate = 0,
            currentPeriod = initCalc.currentPeriod?.toDto(),
            status = savedChallenge.status(today),
            isCreator = true,
            isParticipating = true,
            myPenaltyAmount = creatorParticipant.penaltyAmount,
            canJoin = false,
            canCancel = false,
            canDelete = savedChallenge.canDelete(today),
            canModifyFull = savedChallenge.canModifyFullConditions(today),
            participants = listOf(participantResponse)
        )
    }

    fun getGroupChallenges(
        groupId: Long,
        userId: Long,
        statusFilter: String? = null,
        today: LocalDate = DateTimeUtils.todayKst()
    ): List<ChallengeSummaryResponse> {
        groupMemberRepository.findByGroupIdAndUserId(
            groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 조회할 수 있습니다.")

        val challenges = challengeRepository.findAllByGroupIdOrderByStartDateAscCreatedAtDesc(groupId)

        return challenges.mapNotNull { challenge ->
            val status = challenge.status(today)
            if (statusFilter != null && !statusFilter.equals(
                    "ALL",
                    ignoreCase = true
                )
            ) {
                if (!status.name.equals(
                        statusFilter,
                        ignoreCase = true
                    )
                ) {
                    return@mapNotNull null
                }
            }

            val participantCount = challengeParticipantRepository.countByChallengeIdAndStatus(
                challenge.id,
                ParticipantStatus.ACTIVE
            ).toInt()
            val myParticipant = challengeParticipantRepository.findByChallengeIdAndUserIdAndStatus(
                challenge.id,
                userId,
                ParticipantStatus.ACTIVE
            )

            val durationDays = ChronoUnit.DAYS.between(challenge.startDate, challenge.endDate).toInt() + 1

            ChallengeSummaryResponse(
                id = challenge.id,
                groupId = challenge.groupId,
                title = challenge.title,
                description = challenge.description,
                verificationCriteria = challenge.verificationCriteria,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                durationDays = durationDays,
                periodType = challenge.periodType,
                targetFrequency = challenge.targetFrequency,
                status = status,
                participantCount = participantCount,
                isParticipating = myParticipant != null,
                isCreator = challenge.creatorUserId == userId,
                myPenaltyAmount = myParticipant?.penaltyAmount,
                createdAt = challenge.createdAt
            )
        }
    }

    fun getChallengeDetail(
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeDetailResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        groupMemberRepository.findByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 조회할 수 있습니다.")

        val group = groupRepository.findById(challenge.groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: ${challenge.groupId})")
        }

        val participants = challengeParticipantRepository.findAllByChallengeIdAndStatus(
            challengeId,
            ParticipantStatus.ACTIVE
        )
        val userMap = userRepository.findAllById(participants.map { it.userId }).associateBy { it.id }
        val creatorUser = userRepository.findById(challenge.creatorUserId).orElse(null)

        val allRecords = dailyRecordRepository?.findAllByChallengeId(challengeId).orEmpty()
        val participantResponses = participants.map { p ->
            val user = userMap[p.userId]
            val pRecords = allRecords.filter { it.challengeParticipantId == p.id && it.status == DailyRecordStatus.COMPLETED }
            val pCompletedDates = pRecords.map { it.date }.toSet()
            val pCalc = ChallengePeriodCalculator.calculate(
                challengeStartDate = challenge.startDate,
                challengeEndDate = challenge.endDate,
                participantStartDate = p.startDate,
                periodType = challenge.periodType,
                targetFrequency = challenge.targetFrequency,
                completedDates = pCompletedDates,
                today = today
            )

            ChallengeParticipantResponse(
                id = p.id,
                userId = p.userId,
                nickname = user?.nickname ?: "탈퇴한 사용자",
                profileImageUrl = user?.profileImageUrl,
                penaltyAmount = p.penaltyAmount,
                startDate = p.startDate,
                status = p.status,
                completionRate = pCalc.progressRate,
                joinedAt = p.joinedAt,
                isCreator = p.userId == challenge.creatorUserId
            )
        }

        val myParticipant = participants.find { it.userId == userId }
        val isCreator = challenge.creatorUserId == userId
        val isParticipating = myParticipant != null

        val myRecords = myParticipant?.let { p ->
            allRecords.filter { it.challengeParticipantId == p.id && it.status == DailyRecordStatus.COMPLETED }
        }.orEmpty()
        val myCompletedDates = myRecords.map { it.date }.toSet()
        val myEffectiveStart = myParticipant?.startDate ?: challenge.startDate
        val myCalc = ChallengePeriodCalculator.calculate(
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            participantStartDate = myEffectiveStart,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            completedDates = myCompletedDates,
            today = today
        )

        val durationDays = ChronoUnit.DAYS.between(challenge.startDate, challenge.endDate).toInt() + 1

        return ChallengeDetailResponse(
            id = challenge.id,
            groupId = group.id,
            groupName = group.name,
            creatorUserId = challenge.creatorUserId,
            creatorNickname = creatorUser?.nickname ?: "생성자",
            title = challenge.title,
            description = challenge.description,
            verificationCriteria = challenge.verificationCriteria,
            startDate = challenge.startDate,
            endDate = challenge.endDate,
            durationDays = durationDays,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            totalTargetCount = myCalc.totalTargetCount,
            totalCompletedCount = myCalc.totalCompletedCount,
            progressRate = myCalc.progressRate,
            currentPeriod = myCalc.currentPeriod?.toDto(),
            status = challenge.status(today),
            isCreator = isCreator,
            isParticipating = isParticipating,
            myPenaltyAmount = myParticipant?.penaltyAmount,
            canJoin = challenge.canJoin(today) && !isParticipating,
            canCancel = myParticipant?.canCancel(today) == true && !isCreator,
            canDelete = challenge.canDelete(today) && isCreator,
            canModifyFull = challenge.canModifyFullConditions(today) && isCreator,
            participants = participantResponses
        )
    }

    fun getJoinPreview(
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ): JoinPreviewResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        groupMemberRepository.findByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지 정보를 조회할 수 있습니다.")

        if (challenge.isEnded(today)) {
            throw BadRequestException("이미 종료된 챌린지입니다.")
        }

        if (challengeParticipantRepository.existsByChallengeIdAndUserIdAndStatus(
                challengeId,
                userId,
                ParticipantStatus.ACTIVE
            )
        ) {
            throw DuplicateResourceException("이미 참여 중인 챌린지입니다.")
        }

        val isStarted = challenge.isStarted(today)
        val options = mutableListOf<JoinOptionDto>()

        if (!isStarted) {
            val days = ChronoUnit.DAYS.between(
                challenge.startDate,
                challenge.endDate
            ).toInt() + 1
            options.add(
                JoinOptionDto(
                    type = StartDateType.TOMORROW,
                    startDate = challenge.startDate,
                    remainingDays = days,
                    isRecommended = true
                )
            )
        } else {
            // 진행 중인 경우: 오늘부터 및 내일부터 옵션
            val daysToday = ChronoUnit.DAYS.between(
                today,
                challenge.endDate
            ).toInt() + 1
            val isLastDay = today >= challenge.endDate
            options.add(
                JoinOptionDto(
                    type = StartDateType.TODAY,
                    startDate = today,
                    remainingDays = daysToday,
                    isRecommended = isLastDay
                )
            )

            if (!isLastDay) {
                val tomorrow = today.plusDays(1)
                val daysTomorrow = ChronoUnit.DAYS.between(
                    tomorrow,
                    challenge.endDate
                ).toInt() + 1
                options.add(
                    JoinOptionDto(
                        type = StartDateType.TOMORROW,
                        startDate = tomorrow,
                        remainingDays = daysTomorrow,
                        isRecommended = true
                    )
                )
            }
        }

        return JoinPreviewResponse(
            challengeId = challenge.id,
            challengeTitle = challenge.title,
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            isStarted = isStarted,
            options = options,
            defaultPenaltyAmount = 5000
        )
    }

    @Transactional
    fun joinChallenge(
        challengeId: Long,
        userId: Long,
        request: JoinChallengeRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeParticipantResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        groupMemberRepository.findByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지에 참여할 수 있습니다.")

        if (!challenge.canJoin(today)) {
            throw ChallengeAlreadyStartedException("이미 종료된 챌린지에는 참여할 수 없습니다.")
        }

        val existing = challengeParticipantRepository.findByChallengeIdAndUserId(
            challengeId,
            userId
        )
        if (existing != null && existing.status == ParticipantStatus.ACTIVE) {
            throw DuplicateResourceException("이미 참여 중인 챌린지입니다.")
        }

        val calculatedStartDate = challenge.calculateStartDate(
            request.startDateType,
            today
        )

        val participant = if (existing != null && existing.status == ParticipantStatus.CANCELLED) {
            existing.reactivate(
                calculatedStartDate,
                request.penaltyAmount
            )
            challengeParticipantRepository.save(existing)
        } else {
            challengeParticipantRepository.save(
                ChallengeParticipant(
                    challengeId = challengeId,
                    userId = userId,
                    penaltyAmount = request.penaltyAmount,
                    startDate = calculatedStartDate,
                    status = ParticipantStatus.ACTIVE
                )
            )
        }
        dailyRecordService?.ensureDailyRecordsForParticipant(
            participant,
            challenge,
            today
        )

        val user = userRepository.findById(userId).orElse(null)
        return ChallengeParticipantResponse(
            id = participant.id,
            userId = userId,
            nickname = user?.nickname ?: "참여자",
            profileImageUrl = user?.profileImageUrl,
            penaltyAmount = participant.penaltyAmount,
            startDate = participant.startDate,
            status = participant.status,
            completionRate = 0,
            joinedAt = participant.joinedAt,
            isCreator = userId == challenge.creatorUserId
        )
    }

    @Transactional
    fun leaveChallenge(
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        groupMemberRepository.findByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지 참여를 취소할 수 있습니다.")

        if (challenge.creatorUserId == userId) {
            throw BadRequestException("챌린지 생성자는 참여를 취소할 수 없습니다. 대신 챌린지를 삭제해주세요.")
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserIdAndStatus(
            challengeId,
            userId,
            ParticipantStatus.ACTIVE
        ) ?: throw ResourceNotFoundException("참여 중인 챌린지가 아닙니다.")

        participant.cancel(today)

        dailyRecordRepository?.let { repo ->
            val recordsToDelete = repo.findAllByChallengeParticipantId(participant.id)
                .filter { it.date >= today }
            if (recordsToDelete.isNotEmpty()) {
                repo.deleteAll(recordsToDelete)
            }
        }
    }

    @Transactional
    fun updateMyPenaltyAmount(
        challengeId: Long,
        userId: Long,
        request: UpdatePenaltyAmountRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeParticipantResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        groupMemberRepository.findByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
            ?: throw ForbiddenException("해당 모임의 멤버만 약정 금액을 변경할 수 있습니다.")

        val participant = challengeParticipantRepository.findByChallengeIdAndUserIdAndStatus(
            challengeId,
            userId,
            ParticipantStatus.ACTIVE
        ) ?: throw ResourceNotFoundException("참여 중인 챌린지가 아닙니다.")

        participant.updatePenalty(
            request.penaltyAmount,
            today
        )
        val user = userRepository.findById(userId).orElse(null)

        val allRecords = dailyRecordRepository?.findAllByChallengeId(challengeId).orEmpty()
        val pRecords = allRecords.filter { it.challengeParticipantId == participant.id && it.status == DailyRecordStatus.COMPLETED }
        val pCompletedDates = pRecords.map { it.date }.toSet()
        val pCalc = ChallengePeriodCalculator.calculate(
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate,
            participantStartDate = participant.startDate,
            periodType = challenge.periodType,
            targetFrequency = challenge.targetFrequency,
            completedDates = pCompletedDates,
            today = today
        )

        return ChallengeParticipantResponse(
            id = participant.id,
            userId = userId,
            nickname = user?.nickname ?: "참여자",
            profileImageUrl = user?.profileImageUrl,
            penaltyAmount = participant.penaltyAmount,
            startDate = participant.startDate,
            status = participant.status,
            completionRate = pCalc.progressRate,
            joinedAt = participant.joinedAt,
            isCreator = userId == challenge.creatorUserId
        )
    }

    @Transactional
    fun updateChallenge(
        challengeId: Long,
        userId: Long,
        request: UpdateChallengeRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeDetailResponse {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (challenge.creatorUserId != userId) {
            throw ForbiddenException("챌린지 생성자만 챌린지 조건을 수정할 수 있습니다.")
        }

        challenge.updateConditions(
            newTitle = request.title,
            newDescription = request.description,
            newVerificationCriteria = request.verificationCriteria,
            newStartDate = request.startDate,
            newEndDate = request.endDate,
            newPeriodType = request.periodType,
            newTargetFrequency = request.targetFrequency,
            today = today
        )

        return getChallengeDetail(
            challengeId,
            userId,
            today
        )
    }

    @Transactional
    fun deleteChallenge(
        challengeId: Long,
        userId: Long,
        today: LocalDate = DateTimeUtils.todayKst()
    ) {
        val challenge = challengeRepository.findById(challengeId).orElseThrow {
            ResourceNotFoundException("챌린지를 찾을 수 없습니다. (ID: $challengeId)")
        }

        if (challenge.creatorUserId != userId) {
            throw ForbiddenException("챌린지 생성자만 챌린지를 삭제할 수 있습니다.")
        }

        if (!challenge.canDelete(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 챌린지는 삭제할 수 없습니다.")
        }

        challengeParticipantRepository.deleteAllByChallengeId(challengeId)
        challengeRepository.delete(challenge)
    }

    private fun ChallengePeriodInterval.toDto() = ChallengePeriodIntervalDto(
        index = this.index,
        startDate = this.startDate,
        endDate = this.endDate,
        targetCount = this.targetCount,
        completedCount = this.completedCount,
        isAchieved = this.isAchieved
    )
}
