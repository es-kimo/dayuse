package com.dayuse.domain.today.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.today.dto.TodayActionResponse
import com.dayuse.domain.today.dto.TodayVerificationSummary
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class TodayService(
    private val groupMemberRepository: GroupMemberRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val verificationRepository: VerificationRepository,
    private val presignedUrlService: PresignedUrlService
) {

    fun getTodayActions(groupId: Long, userId: Long): List<TodayActionResponse> {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 오늘 할 일을 조회할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        val challenges = challengeRepository.findAllByGroupId(groupId)

        // 사용자가 참여 중인 챌린지 ID 목록
        val participatingChallengeIds = challengeParticipantRepository.findAllByUserId(userId)
            .map { it.challengeId }
            .toSet()

        // 오늘 진행 중(시작일 <= today <= 종료일)이며 사용자가 참여 중인 챌린지만 추출
        val activeParticipatingChallenges = challenges.filter { challenge ->
            participatingChallengeIds.contains(challenge.id) &&
                    challenge.startDate <= today && today <= challenge.endDate
        }

        return activeParticipatingChallenges.map { challenge ->
            val verification = verificationRepository.findByChallengeIdAndUserIdAndTargetDate(
                challengeId = challenge.id,
                userId = userId,
                targetDate = today
            )

            val isCompleted = verification != null
            val summary = verification?.let {
                TodayVerificationSummary(
                    id = it.id,
                    imageUrl = presignedUrlService.generatePresignedGetUrl(it.imageUrl, it.challengeId, it.userId),
                    comment = it.comment,
                    isLate = it.isLate,
                    createdAt = it.createdAt
                )
            }

            TodayActionResponse(
                challengeId = challenge.id,
                challengeTitle = challenge.title,
                verificationCriteria = challenge.verificationCriteria,
                startDate = challenge.startDate,
                endDate = challenge.endDate,
                isCompletedToday = isCompleted,
                canVerify = !isCompleted,
                myVerification = summary
            )
        }
    }
}
