package com.dayuse.domain.challenge.service

import com.dayuse.domain.challenge.Challenge
import com.dayuse.domain.challenge.ChallengeParticipant
import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ChallengeStatus
import com.dayuse.domain.challenge.dto.ChallengeDetailResponse
import com.dayuse.domain.challenge.dto.ChallengeParticipantResponse
import com.dayuse.domain.challenge.dto.ChallengeSummaryResponse
import com.dayuse.domain.challenge.dto.CreateChallengeRequest
import com.dayuse.domain.challenge.dto.JoinChallengeRequest
import com.dayuse.domain.challenge.dto.UpdateChallengeRequest
import com.dayuse.domain.challenge.dto.UpdatePenaltyAmountRequest
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

@Service
@Transactional(readOnly = true)
class ChallengeService(
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createChallenge(
        groupId: Long,
        userId: Long,
        request: CreateChallengeRequest,
        today: LocalDate = DateTimeUtils.todayKst()
    ): ChallengeDetailResponse {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
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

        val challenge = challengeRepository.save(
            Challenge(
                groupId = groupId,
                creatorUserId = userId,
                title = request.title,
                description = request.description,
                verificationCriteria = request.verificationCriteria,
                startDate = request.startDate,
                endDate = calculatedEndDate
            )
        )

        // 생성자 자동 참여 처리 (원자적 단일 트랜잭션)
        val creatorParticipant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challenge.id,
                userId = userId,
                penaltyAmount = request.myPenaltyAmount
            )
        )

        val creatorUser = userRepository.findById(userId).orElse(null)
        val participantResponse = ChallengeParticipantResponse(
            id = creatorParticipant.id,
            userId = userId,
            nickname = creatorUser?.nickname ?: "참여자",
            profileImageUrl = creatorUser?.profileImageUrl,
            penaltyAmount = creatorParticipant.penaltyAmount,
            joinedAt = creatorParticipant.joinedAt,
            isCreator = true
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
            status = challenge.status(today),
            isCreator = true,
            isParticipating = true,
            myPenaltyAmount = creatorParticipant.penaltyAmount,
            canJoin = false,
            canCancel = false,
            canDelete = challenge.canDelete(today),
            canModifyFull = challenge.canModifyFullConditions(today),
            participants = listOf(participantResponse)
        )
    }

    fun getGroupChallenges(
        groupId: Long,
        userId: Long,
        statusFilter: String? = null,
        today: LocalDate = DateTimeUtils.todayKst()
    ): List<ChallengeSummaryResponse> {
        groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 조회할 수 있습니다.")

        val challenges = challengeRepository.findAllByGroupIdOrderByStartDateAscCreatedAtDesc(groupId)

        return challenges.mapNotNull { challenge ->
            val status = challenge.status(today)
            if (statusFilter != null && !statusFilter.equals("ALL", ignoreCase = true)) {
                if (!status.name.equals(statusFilter, ignoreCase = true)) {
                    return@mapNotNull null
                }
            }

            val participantCount = challengeParticipantRepository.countByChallengeId(challenge.id).toInt()
            val myParticipant = challengeParticipantRepository.findByChallengeIdAndUserId(challenge.id, userId)

            ChallengeSummaryResponse(
                id = challenge.id,
                groupId = challenge.groupId,
                title = challenge.title,
                description = challenge.description,
                verificationCriteria = challenge.verificationCriteria,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
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

        groupMemberRepository.findByGroupIdAndUserId(challenge.groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지를 조회할 수 있습니다.")

        val group = groupRepository.findById(challenge.groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: ${challenge.groupId})")
        }

        val participants = challengeParticipantRepository.findAllByChallengeId(challengeId)
        val userMap = userRepository.findAllById(participants.map { it.userId }).associateBy { it.id }
        val creatorUser = userRepository.findById(challenge.creatorUserId).orElse(null)

        val participantResponses = participants.map { p ->
            val user = userMap[p.userId]
            ChallengeParticipantResponse(
                id = p.id,
                userId = p.userId,
                nickname = user?.nickname ?: "탈퇴한 사용자",
                profileImageUrl = user?.profileImageUrl,
                penaltyAmount = p.penaltyAmount,
                joinedAt = p.joinedAt,
                isCreator = p.userId == challenge.creatorUserId
            )
        }

        val myParticipant = participants.find { it.userId == userId }
        val isCreator = challenge.creatorUserId == userId
        val isParticipating = myParticipant != null

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
            status = challenge.status(today),
            isCreator = isCreator,
            isParticipating = isParticipating,
            myPenaltyAmount = myParticipant?.penaltyAmount,
            canJoin = challenge.canJoin(today) && !isParticipating,
            canCancel = challenge.canCancel(today) && isParticipating && !isCreator,
            canDelete = challenge.canDelete(today) && isCreator,
            canModifyFull = challenge.canModifyFullConditions(today) && isCreator,
            participants = participantResponses
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

        groupMemberRepository.findByGroupIdAndUserId(challenge.groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지에 참여할 수 있습니다.")

        if (!challenge.canJoin(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 챌린지에는 참여할 수 없습니다.")
        }

        if (challengeParticipantRepository.existsByChallengeIdAndUserId(challengeId, userId)) {
            throw DuplicateResourceException("이미 참여 중인 챌린지입니다.")
        }

        val participant = challengeParticipantRepository.save(
            ChallengeParticipant(
                challengeId = challengeId,
                userId = userId,
                penaltyAmount = request.penaltyAmount
            )
        )

        val user = userRepository.findById(userId).orElse(null)
        return ChallengeParticipantResponse(
            id = participant.id,
            userId = userId,
            nickname = user?.nickname ?: "참여자",
            profileImageUrl = user?.profileImageUrl,
            penaltyAmount = participant.penaltyAmount,
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

        groupMemberRepository.findByGroupIdAndUserId(challenge.groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버만 챌린지 참여를 취소할 수 있습니다.")

        if (!challenge.canCancel(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 챌린지는 참여 취소할 수 없습니다.")
        }

        if (challenge.creatorUserId == userId) {
            throw BadRequestException("챌린지 생성자는 참여를 취소할 수 없습니다. 대신 챌린지를 삭제해주세요.")
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, userId)
            ?: throw ResourceNotFoundException("참여 중인 챌린지가 아닙니다.")

        challengeParticipantRepository.delete(participant)
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

        if (challenge.isStarted(today)) {
            throw ChallengeAlreadyStartedException("이미 시작된 챌린지는 약정 금액을 변경할 수 없습니다.")
        }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, userId)
            ?: throw ResourceNotFoundException("참여 중인 챌린지가 아닙니다.")

        participant.penaltyAmount = request.penaltyAmount
        val user = userRepository.findById(userId).orElse(null)

        return ChallengeParticipantResponse(
            id = participant.id,
            userId = userId,
            nickname = user?.nickname ?: "참여자",
            profileImageUrl = user?.profileImageUrl,
            penaltyAmount = participant.penaltyAmount,
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
            today = today
        )

        return getChallengeDetail(challengeId, userId, today)
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
}
