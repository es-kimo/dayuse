package com.dayuse.domain.share.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.ParticipantStatus
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.share.ShareCard
import com.dayuse.domain.share.ShareCardRepository
import com.dayuse.domain.share.ShareCardType
import com.dayuse.domain.share.dto.PublicShareCardResponse
import com.dayuse.domain.share.dto.ShareCardResponse
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.service.PresignedUrlService
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional
class ShareCardService(
    private val shareCardRepository: ShareCardRepository,
    private val verificationRepository: VerificationRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val userRepository: UserRepository,
    private val streakCalculator: StreakCalculator,
    private val presignedUrlService: PresignedUrlService
) {

    fun createVerificationShare(userId: Long, verificationId: Long): ShareCardResponse {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        if (verification.userId != userId) {
            throw ForbiddenException("본인이 작성한 인증만 공유할 수 있습니다.")
        }

        // 기존 활성 공유 카드가 있으면 재사용
        val existingCard = shareCardRepository.findByVerificationIdAndIsActiveTrue(verificationId)
        if (existingCard != null) {
            val presignedUrl = existingCard.imageUrl?.let {
                presignedUrlService.generatePresignedGetUrl(it, existingCard.challengeId, existingCard.userId)
            }
            return ShareCardResponse.from(existingCard, presignedUrl)
        }

        val challenge = challengeRepository.findById(verification.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }
        val user = userRepository.findById(userId)
            .orElseThrow { ResourceNotFoundException("사용자를 찾을 수 없습니다.") }

        val shareCard = ShareCard(
            token = UUID.randomUUID().toString(),
            cardType = ShareCardType.TODAY_VERIFICATION,
            userId = userId,
            challengeId = challenge.id,
            verificationId = verification.id,
            title = challenge.title,
            userNickname = user.nickname,
            imageUrl = verification.imageUrl,
            comment = verification.comment,
            streakDays = 0,
            historyJson = null,
            isActive = true
        )
        val saved = shareCardRepository.save(shareCard)
        val presignedUrl = saved.imageUrl?.let {
            presignedUrlService.generatePresignedGetUrl(it, saved.challengeId, saved.userId)
        }
        return ShareCardResponse.from(saved, presignedUrl)
    }

    fun createStreakShare(userId: Long, challengeId: Long): ShareCardResponse {
        val challenge = challengeRepository.findById(challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }

        val participant = challengeParticipantRepository.findByChallengeIdAndUserId(challengeId, userId)
            ?: throw ForbiddenException("해당 챌린지의 참여자만 연속 기록을 공유할 수 있습니다.")

        if (participant.status != ParticipantStatus.ACTIVE) {
            throw ForbiddenException("활성 참여자만 연속 기록을 공유할 수 있습니다.")
        }

        val user = userRepository.findById(userId)
            .orElseThrow { ResourceNotFoundException("사용자를 찾을 수 없습니다.") }

        val records = dailyRecordRepository.findAllByChallengeParticipantId(participant.id)
        val streakResult = streakCalculator.calculateStreak(
            records = records,
            participantStartDate = participant.startDate,
            challengeStartDate = challenge.startDate,
            challengeEndDate = challenge.endDate
        )

        val shareCard = ShareCard(
            token = UUID.randomUUID().toString(),
            cardType = ShareCardType.STREAK,
            userId = userId,
            challengeId = challenge.id,
            verificationId = null,
            title = challenge.title,
            userNickname = user.nickname,
            imageUrl = null,
            comment = null,
            streakDays = streakResult.streakDays,
            historyJson = streakResult.historyJson,
            isActive = true
        )
        val saved = shareCardRepository.save(shareCard)
        return ShareCardResponse.from(saved)
    }

    @Transactional(readOnly = true)
    fun getPublicShareCard(token: String): PublicShareCardResponse {
        val card = shareCardRepository.findByToken(token)
            ?: throw ResourceNotFoundException("공유 카드를 찾을 수 없거나 비활성화되었습니다.")

        if (!card.isActive) {
            throw ResourceNotFoundException("공유 카드를 찾을 수 없거나 비활성화되었습니다.")
        }

        val presignedUrl = card.imageUrl?.let {
            presignedUrlService.generatePresignedGetUrl(it, card.challengeId, card.userId)
        }
        return PublicShareCardResponse.from(card, presignedUrl)
    }

    fun deactivateShareCard(userId: Long, token: String) {
        val card = shareCardRepository.findByToken(token)
            ?: throw ResourceNotFoundException("공유 카드를 찾을 수 없습니다.")

        card.validateOwner(userId)
        card.deactivate()
    }
}
