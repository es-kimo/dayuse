package com.dayuse.domain.feed.service

import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.feed.dto.FeedItemResponse
import com.dayuse.domain.feed.dto.FeedPageResponse
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ForbiddenException
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class FeedService(
    private val verificationRepository: VerificationRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val challengeRepository: ChallengeRepository,
    private val userRepository: UserRepository,
    private val presignedUrlService: PresignedUrlService
) {

    fun getGroupFeed(groupId: Long, userId: Long, pageable: Pageable): FeedPageResponse {
        // 1. 타 모임 접근 차단 (403 Forbidden)
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 피드를 조회할 수 있습니다.")
        }

        // 2. 모임 인증 피드 최신순 페이징 조회
        val verificationPage = verificationRepository.findByGroupIdOrderByCreatedAtDesc(groupId, pageable)
        val verifications = verificationPage.content

        if (verifications.isEmpty()) {
            return FeedPageResponse(
                items = emptyList(),
                pageNumber = verificationPage.number,
                pageSize = verificationPage.size,
                totalElements = verificationPage.totalElements,
                totalPages = verificationPage.totalPages,
                hasNext = verificationPage.hasNext()
            )
        }

        // 3. N+1 문제 방지를 위한 사용자 및 챌린지 정보 배치 조회 (IN 쿼리)
        val userIds = verifications.map { it.userId }.toSet()
        val userMap = userRepository.findAllById(userIds).associateBy { it.id }

        val challengeIds = verifications.map { it.challengeId }.toSet()
        val challengeMap = challengeRepository.findAllById(challengeIds).associateBy { it.id }

        val items = verifications.map { verification ->
            val user = userMap[verification.userId]
            val challenge = challengeMap[verification.challengeId]

            FeedItemResponse(
                id = verification.id,
                groupId = verification.groupId,
                challengeId = verification.challengeId,
                challengeTitle = challenge?.title ?: "알 수 없는 챌린지",
                userId = verification.userId,
                authorNickname = user?.nickname ?: "알 수 없음",
                authorProfileImageUrl = user?.profileImageUrl,
                targetDate = verification.targetDate,
                imageUrl = presignedUrlService.generatePresignedGetUrl(verification.imageUrl),
                comment = verification.comment,
                isLate = verification.isLate,
                commentCount = verification.comments.size,
                isMine = verification.userId == userId,
                createdAt = verification.createdAt
            )
        }

        return FeedPageResponse(
            items = items,
            pageNumber = verificationPage.number,
            pageSize = verificationPage.size,
            totalElements = verificationPage.totalElements,
            totalPages = verificationPage.totalPages,
            hasNext = verificationPage.hasNext()
        )
    }
}
