package com.dayuse.domain.verification.service

import com.dayuse.domain.challenge.ChallengeParticipantRepository
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.service.DailyRecordService
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.verification.Verification
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CreateVerificationRequest
import com.dayuse.domain.verification.dto.UpdateVerificationRequest
import com.dayuse.domain.verification.dto.VerificationDetailResponse
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.DuplicateResourceException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.hibernate.exception.ConstraintViolationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class VerificationService(
    private val verificationRepository: VerificationRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengeParticipantRepository: ChallengeParticipantRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val presignedUrlService: PresignedUrlService,
    private val dailyRecordService: DailyRecordService? = null,
    private val dailyRecordRepository: DailyRecordRepository? = null
) {

    fun createVerification(
        userId: Long,
        request: CreateVerificationRequest
    ): VerificationDetailResponse {
        val challenge = challengeRepository.findById(request.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }

        // 1. 모임원 권한 검증
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(
            challenge.groupId,
            userId
        )
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 인증할 수 있습니다.")
        }

        // 2. 챌린지 참여자 여부 검증
        val isParticipant = challengeParticipantRepository.existsByChallengeIdAndUserId(
            challenge.id,
            userId
        )
        if (!isParticipant) {
            throw ForbiddenException("해당 챌린지의 참여자만 인증할 수 있습니다.")
        }

        val today = DateTimeUtils.todayKst()
        val targetDate = request.targetDate ?: today

        // 3. 미래 날짜 인증 방지 및 챌린지 기간 검증
        if (targetDate > today) {
            throw BadRequestException("미래 날짜에 대한 인증은 미리 등록할 수 없습니다.")
        }

        if (targetDate < challenge.startDate || targetDate > challenge.endDate) {
            throw BadRequestException("인증 대상 날짜는 챌린지 기간 내여야 합니다.")
        }

        // 4. 지각 여부 계산 (대상 날짜 익일 09:00 KST 이전이면 정상, 이후이면 지각)
        val isLate = if (targetDate < today) DateTimeUtils.isLateVerification(targetDate) else false

        // 5. 중복 인증 애플리케이션 레벨 1차 체크
        if (verificationRepository.existsByChallengeIdAndUserIdAndTargetDate(
                challenge.id,
                userId,
                targetDate
            )
        ) {
            throw DuplicateResourceException("해당 챌린지는 대상 날짜에 이미 인증을 완료했습니다.")
        }

        presignedUrlService.validateImageOwnership(request.imageUrl, challenge.id, userId)

        try {
            val verification = Verification(
                groupId = challenge.groupId,
                challengeId = challenge.id,
                userId = userId,
                targetDate = targetDate,
                isLate = isLate,
                imageUrl = request.imageUrl,
                comment = request.comment
            )
            val saved = verificationRepository.save(verification)
            dailyRecordService?.onVerificationCreated(saved)
            return toDetailResponse(saved)
        } catch (e: DataIntegrityViolationException) {
            val constraintViolation = generateSequence<Throwable>(e) { it.cause }
                .filterIsInstance<ConstraintViolationException>()
                .firstOrNull()

            if (constraintViolation?.constraintName == "uk_verification_challenge_user_date") {
                throw DuplicateResourceException("해당 챌린지는 대상 날짜에 이미 인증을 완료했습니다.")
            }

            throw e
        }
    }

    fun updateVerification(
        verificationId: Long,
        userId: Long,
        request: UpdateVerificationRequest
    ): VerificationDetailResponse {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        // 작성자 본인 확인
        if (verification.userId != userId) {
            throw ForbiddenException("본인이 작성한 인증만 수정할 수 있습니다.")
        }

        // 과거 인증 정산 락 확인
        val today = DateTimeUtils.todayKst()
        if (verification.targetDate < today) {
            throw BadRequestException("과거 대상 날짜의 인증은 수정할 수 없습니다.")
        }

        presignedUrlService.validateImageOwnership(request.imageUrl, verification.challengeId, verification.userId)

        verification.update(
            request.imageUrl,
            request.comment
        )
        return toDetailResponse(verification)
    }

    fun deleteVerification(
        verificationId: Long,
        userId: Long
    ) {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        // 작성자 본인 확인
        if (verification.userId != userId) {
            throw ForbiddenException("본인이 작성한 인증만 삭제할 수 있습니다.")
        }

        // 정산 락 확인
        val records = dailyRecordRepository?.findAllByVerificationId(verificationId).orEmpty()
        if (records.any { it.isLocked() }) {
            throw BadRequestException("정산 진행 중이거나 완료된 기록의 인증은 삭제할 수 없습니다.")
        }

        verificationRepository.delete(verification)
        dailyRecordService?.onVerificationDeleted(verification)
    }

    private fun toDetailResponse(v: Verification): VerificationDetailResponse {
        return VerificationDetailResponse(
            id = v.id,
            groupId = v.groupId,
            challengeId = v.challengeId,
            userId = v.userId,
            targetDate = v.targetDate,
            imageUrl = presignedUrlService.generatePresignedGetUrl(v.imageUrl, v.challengeId, v.userId),
            comment = v.comment,
            isLate = v.isLate,
            createdAt = v.createdAt,
            updatedAt = v.updatedAt
        )
    }
}
