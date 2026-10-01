package com.dayuse.domain.ad.service

import com.dayuse.domain.ad.AdCampaign
import com.dayuse.domain.ad.AdCampaignRepository
import com.dayuse.domain.ad.AdCampaignStatus
import com.dayuse.domain.ad.AdCreative
import com.dayuse.domain.ad.AdCreativeRepository
import com.dayuse.domain.ad.AdRewardHistory
import com.dayuse.domain.ad.AdRewardHistoryRepository
import com.dayuse.domain.ad.AdSession
import com.dayuse.domain.ad.AdSessionRepository
import com.dayuse.domain.ad.AdSessionStatus
import com.dayuse.domain.ad.AdSlotType
import com.dayuse.domain.ad.AdUnavailableReason
import com.dayuse.domain.ad.dto.AdAbandonResponse
import com.dayuse.domain.ad.dto.AdCampaignResponse
import com.dayuse.domain.ad.dto.AdCreativeResponse
import com.dayuse.domain.ad.dto.AdImpressionResponse
import com.dayuse.domain.ad.dto.AdSessionIssueResponse
import com.dayuse.domain.ad.dto.CompleteAdSessionRequest
import com.dayuse.domain.ad.dto.CompleteAdSessionResponse
import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.dto.RequestAdSessionRequest
import com.dayuse.domain.ad.dto.UpdateAdCampaignRequest
import com.dayuse.domain.ad.dto.UpdateAdCreativeRequest
import com.dayuse.domain.analytics.service.RedayAnalyticsRecorder
import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.PenaltyStatus
import com.dayuse.domain.redayticket.RedayTicket
import com.dayuse.domain.redayticket.RedayTicketRepository
import com.dayuse.domain.redayticket.RedayTicketSource
import com.dayuse.domain.redayticket.RedayTicketStatus
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.DayuseException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
class AdService(
    private val adCampaignRepository: AdCampaignRepository,
    private val adCreativeRepository: AdCreativeRepository,
    private val adSessionRepository: AdSessionRepository,
    private val adRewardHistoryRepository: AdRewardHistoryRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val challengeRepository: ChallengeRepository,
    private val redayTicketRepository: RedayTicketRepository,
    private val redayAnalyticsRecorder: RedayAnalyticsRecorder
) {

    // ── F07: 자체 광고 캠페인 및 소재 등록·수정·조회 ──────────────────

    fun createCampaign(request: CreateAdCampaignRequest): AdCampaignResponse {
        val normalizedKey = request.campaignKey.trim()
        if (normalizedKey.isBlank()) {
            throw BadRequestException("캠페인 식별 키는 비어 있을 수 없습니다.")
        }
        if (adCampaignRepository.findByCampaignKey(normalizedKey) != null) {
            throw BadRequestException("이미 존재하는 캠페인 키입니다: $normalizedKey")
        }

        val campaign = adCampaignRepository.save(
            AdCampaign(
                campaignKey = normalizedKey,
                title = request.title.trim(),
                slotType = request.slotType,
                status = request.status,
                priority = request.priority,
                dailyImpressionLimit = request.dailyImpressionLimit,
                startAt = request.startAt,
                endAt = request.endAt
            )
        )

        val creatives = request.creatives.map { input ->
            adCreativeRepository.save(
                AdCreative(
                    campaignId = campaign.id,
                    title = input.title.trim(),
                    description = input.description.trim(),
                    imageUrl = input.imageUrl?.trim()?.ifBlank { null },
                    ctaText = input.ctaText?.trim()?.ifBlank { null },
                    badgeText = AdCreative.REQUIRED_BADGE_TEXT,
                    minWatchSeconds = input.minWatchSeconds,
                    active = input.active
                )
            )
        }

        return AdCampaignResponse.from(campaign, creatives)
    }

    fun updateCampaign(campaignId: Long, request: UpdateAdCampaignRequest): AdCampaignResponse {
        val campaign = adCampaignRepository.findById(campaignId)
            .orElseThrow { ResourceNotFoundException("광고 캠페인을 찾을 수 없습니다.") }

        campaign.update(
            newTitle = request.title,
            newStatus = request.status,
            newPriority = request.priority,
            newDailyImpressionLimit = request.dailyImpressionLimit,
            newStartAt = request.startAt,
            newEndAt = request.endAt
        )

        val creatives = adCreativeRepository.findAllByCampaignIdOrderByIdAsc(campaign.id)
        return AdCampaignResponse.from(campaign, creatives)
    }

    fun addCreative(campaignId: Long, input: CreateAdCreativeInput): AdCreativeResponse {
        val campaign = adCampaignRepository.findById(campaignId)
            .orElseThrow { ResourceNotFoundException("광고 캠페인을 찾을 수 없습니다.") }

        val creative = adCreativeRepository.save(
            AdCreative(
                campaignId = campaign.id,
                title = input.title.trim(),
                description = input.description.trim(),
                imageUrl = input.imageUrl?.trim()?.ifBlank { null },
                ctaText = input.ctaText?.trim()?.ifBlank { null },
                badgeText = AdCreative.REQUIRED_BADGE_TEXT,
                minWatchSeconds = input.minWatchSeconds,
                active = input.active
            )
        )
        return AdCreativeResponse.from(creative)
    }

    fun updateCreative(creativeId: Long, request: UpdateAdCreativeRequest): AdCreativeResponse {
        val creative = adCreativeRepository.findById(creativeId)
            .orElseThrow { ResourceNotFoundException("광고 소재를 찾을 수 없습니다.") }

        creative.update(
            newTitle = request.title,
            newDescription = request.description,
            newImageUrl = request.imageUrl,
            newCtaText = request.ctaText,
            newMinWatchSeconds = request.minWatchSeconds,
            newActive = request.active
        )
        return AdCreativeResponse.from(creative)
    }

    @Transactional(readOnly = true)
    fun getCampaigns(): List<AdCampaignResponse> {
        val campaigns = adCampaignRepository.findAllByOrderByPriorityDescIdAsc()
        return campaigns.map { campaign ->
            val creatives = adCreativeRepository.findAllByCampaignIdOrderByIdAsc(campaign.id)
            AdCampaignResponse.from(campaign, creatives)
        }
    }

    /**
     * 초기 시드용 캠페인·소재 멱등 보장.
     * 이미 동일 campaignKey가 있으면 기존 운영 상태를 덮어쓰지 않고 그대로 반환합니다.
     */
    fun ensureSeedCampaign(request: CreateAdCampaignRequest): AdCampaignResponse {
        val existing = adCampaignRepository.findByCampaignKey(request.campaignKey.trim())
        if (existing != null) {
            val creatives = adCreativeRepository.findAllByCampaignIdOrderByIdAsc(existing.id)
            return AdCampaignResponse.from(existing, creatives)
        }
        return createCampaign(request)
    }

    // ── F08: 적격 사용자 검증 및 광고 세션 발급 ────────────────────────

    /**
     * 적격 사용자에게 우선순위·기간·실제 노출 상한 규칙에 따라 광고 세션을 발급합니다.
     *
     * 주의사항:
     * - 광고가 없거나 일일 노출 상한에 도달하더라도 대상 기록의 벌금 상태나 리데이 기한을 절대 변경하지 않습니다.
     * - 일일 노출 상한은 세션 발급(served)이 아닌 당일 KST 실제 노출(impressionAt != null) 기준으로 계산합니다.
     */
    fun requestAdSession(
        userId: Long,
        request: RequestAdSessionRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AdSessionIssueResponse {
        // F13: 발급 시도 자체를 기록한다. 아래 검증에서 예외로 끊겨도 시도는 남는다.
        redayAnalyticsRecorder.adRequested(
            userId = userId,
            dailyRecordId = request.dailyRecordId,
            slotType = request.slotType.name
        )

        // 1. 적격 사용자 및 대상 지각 기록, 보유 티켓 부족, 단일 진행 세션 제한 검증
        val record = try {
            validateEligibilityAndSingleActiveSession(userId, request.dailyRecordId, now)
        } catch (ex: DayuseException) {
            redayAnalyticsRecorder.recoveryFailed(
                userId = userId,
                dailyRecordId = request.dailyRecordId,
                step = "ad_session_request",
                reason = ex.javaClass.simpleName
            )
            throw ex
        }

        // 2. 캠페인/소재 선택 및 세션 발급 (또는 불가 사유 반환)
        val response = selectCampaignAndIssueSession(
            userId = userId,
            dailyRecordId = record.id,
            slotType = request.slotType,
            now = now
        )

        // F13: 발급 성공(ad_served)과 광고 없음(ad_unavailable)을 구분해 기록한다.
        val session = response.session
        if (session != null) {
            redayAnalyticsRecorder.adServed(
                userId = userId,
                sessionId = session.sessionId,
                dailyRecordId = session.dailyRecordId,
                campaignId = session.campaignId,
                creativeId = session.creativeId,
                requiredWatchSeconds = session.requiredWatchSeconds
            )
        } else {
            redayAnalyticsRecorder.adUnavailable(
                userId = userId,
                dailyRecordId = record.id,
                reason = response.unavailableReason?.name ?: "UNKNOWN"
            )
        }

        return response
    }

    /**
     * [F08 적격성 검증]
     * 1) 대상 DailyRecord 조회 및 본인 소유(IDOR) 검증
     * 2) 챌린지가 개인 매일(DAILY + INDIVIDUAL) 리데이 허용 상태이며 중단되지 않았는지 검증 (주 N회 차단)
     * 3) 대상 기록이 지각 인증 완료(COMPLETED + verificationId != null + isLate == true)이고,
     *    리데이 미적용·미정산·벌금 보류(PENDING)·리데이 기한 내인지 검증
     * 4) 사용자의 보유 리데이 티켓(AVAILABLE)이 0장(부족)인지 검증
     * 5) 계정당 진행 중인 활성 광고 세션이 없는지 검증 (만료된 기존 세션은 EXPIRED 전환)
     */
    private fun validateEligibilityAndSingleActiveSession(
        userId: Long,
        dailyRecordId: Long,
        now: LocalDateTime
    ): DailyRecord {
        val record = dailyRecordRepository.findById(dailyRecordId)
            .orElseThrow { ResourceNotFoundException("일일 기록을 찾을 수 없습니다.") }

        // IDOR 방어: 본인 기록인지 확인
        if (record.userId != userId) {
            throw ForbiddenException("본인의 인증 기록에 대해서만 리데이 광고를 요청할 수 있습니다.")
        }

        // 챌린지 정책 검증 (주 N회, 함께하기, 리데이 미허용, 중단된 챌린지 차단)
        val challenge = challengeRepository.findById(record.challengeId)
            .orElseThrow { ResourceNotFoundException("챌린지를 찾을 수 없습니다.") }
        if (!challenge.isRedaySupportedType()) {
            throw BadRequestException("주 N회 또는 함께하기 챌린지 기록에는 리데이 광고를 요청할 수 없습니다.")
        }
        if (!challenge.isRedayActive()) {
            throw BadRequestException("리데이가 허용되지 않은 챌린지입니다.")
        }
        if (challenge.isAborted()) {
            throw BadRequestException("중단된 챌린지 기록에는 리데이를 사용할 수 없습니다.")
        }

        // 대상 기록의 리데이 적격 상태 검증
        if (record.redayApplied || record.penaltyStatus == PenaltyStatus.EXEMPTED) {
            throw BadRequestException("이미 리데이가 적용된 기록입니다.")
        }
        if (record.isLocked()) {
            throw BadRequestException("이미 입금 신고 중이거나 정산 완료된 기록입니다.")
        }
        if (record.status != DailyRecordStatus.COMPLETED || record.verificationId == null) {
            throw BadRequestException("지각 인증을 먼저 등록해야 리데이 티켓 광고를 시청할 수 있습니다.")
        }
        if (!record.isLate) {
            throw BadRequestException("정상 인증 또는 익일 오전 9시 전 늦은 인증 기록은 리데이 대상이 아닙니다.")
        }
        if (record.penaltyStatus == PenaltyStatus.CONFIRMED) {
            throw BadRequestException("이미 확정된 벌금에는 리데이를 사용할 수 없습니다.")
        }
        val deadline = record.effectiveRedayDeadline()
        if (!now.isBefore(deadline)) {
            throw BadRequestException("리데이 가능 기한(대상일 이틀 뒤 오전 9시)이 지났습니다.")
        }

        // 보유 리데이 티켓 부족(0장) 검증
        val availableTickets = redayTicketRepository.countByUserIdAndStatus(userId, RedayTicketStatus.AVAILABLE)
        if (availableTickets > 0) {
            throw BadRequestException("사용 가능한 리데이 티켓이 이미 보유되어 있습니다. 보유 티켓을 먼저 사용해 주세요.")
        }

        // 계정당 진행 중 활성 세션 1개 제한 검증 (비관적 잠금)
        val candidateSessions = adSessionRepository.findActiveCandidateSessionsByUserIdWithLock(userId)
        for (session in candidateSessions) {
            session.expireIfNeeded(now)
            if (session.isInProgressAt(now)) {
                throw BadRequestException("이미 진행 중인 광고 세션이 있습니다.")
            }
        }

        return record
    }

    /**
     * [F08 캠페인·소재 선택 및 세션 발급]
     * 1) 요청 슬롯의 캠페인을 우선순위 내림차순(동률 시 ID 오름차순)으로 조회
     * 2) 현재 시각(now) 기준 운영 가능(`isServableAt`)하고 활성 소재(`active = true`)가 있는 1차 후보 필터링
     *    - 1차 후보가 0건이면 `NO_AVAILABLE_AD` 반환
     * 3) 1차 후보들을 순회하며 당일(KST 00:00 ~ 익일 00:00) 사용자의 실제 노출(`impressionAt != null`) 횟수가
     *    캠페인별 `dailyImpressionLimit` 미만인 첫 번째 캠페인을 선택
     *    - 모든 후보가 상한에 도달했으면 `DAILY_LIMIT_REACHED` 반환
     * 4) 선택된 소재의 최소 시청 시간과 10분 유효기간을 스냅샷하여 `AdSession` 발급·저장
     */
    private fun selectCampaignAndIssueSession(
        userId: Long,
        dailyRecordId: Long,
        slotType: AdSlotType,
        now: LocalDateTime
    ): AdSessionIssueResponse {
        val allCampaigns = adCampaignRepository.findAllBySlotTypeOrderByPriorityDescIdAsc(slotType)

        // 1차 후보: ACTIVE 상태 + 운영 기간 내 + 활성 소재 1개 이상 보유
        val servableCandidates = allCampaigns.mapNotNull { campaign ->
            if (!campaign.isServableAt(now, slotType)) {
                null
            } else {
                val activeCreatives = adCreativeRepository.findAllByCampaignIdAndActiveTrueOrderByIdAsc(campaign.id)
                if (activeCreatives.isEmpty()) null else Pair(campaign, activeCreatives)
            }
        }

        if (servableCandidates.isEmpty()) {
            return AdSessionIssueResponse.unavailable(
                reason = AdUnavailableReason.NO_AVAILABLE_AD,
                message = "현재 시청 가능한 자체 안내 광고가 없습니다."
            )
        }

        // 2차 후보: 당일(KST) 사용자별 실제 노출(impression) 상한 미달 캠페인 선택
        val startOfDay = now.toLocalDate().atStartOfDay()
        val endOfDay = startOfDay.plusDays(1)

        val selectedPair = servableCandidates.firstOrNull { (campaign, _) ->
            val todayImpressions = adSessionRepository.countActualImpressionsByCampaignAndUserBetween(
                campaignId = campaign.id,
                userId = userId,
                startOfDay = startOfDay,
                endOfDay = endOfDay
            )
            todayImpressions < campaign.dailyImpressionLimit
        } ?: return AdSessionIssueResponse.unavailable(
            reason = AdUnavailableReason.DAILY_LIMIT_REACHED,
            message = "오늘 시청 가능한 광고 횟수를 모두 사용했습니다."
        )

        val (selectedCampaign, activeCreatives) = selectedPair
        val selectedCreative = activeCreatives.first()

        val session = adSessionRepository.save(
            AdSession(
                userId = userId,
                dailyRecordId = dailyRecordId,
                campaignId = selectedCampaign.id,
                creativeId = selectedCreative.id,
                slotType = slotType,
                status = AdSessionStatus.ISSUED,
                requiredWatchSeconds = selectedCreative.minWatchSeconds,
                issuedAt = now,
                expiresAt = now.plusMinutes(AdSession.DEFAULT_SESSION_TTL_MINUTES)
            )
        )

        return AdSessionIssueResponse.issued(session, selectedCreative)
    }

    // ── F09 & F10: 광고 노출·시청 중단·완료 검증 및 리데이 티켓 보상 지급 ──

    /**
     * [F09] 광고 세션 최초 노출(`impression`) 기록
     * - 세션 소유자 본인만 호출 가능 (타인 요청 시 403 Forbidden)
     * - 최초 1회만 `impressionAt`을 기록하며, 이미 노출된 세션에 대한 반복 호출은 최초 노출 시각을 유지(멱등)합니다.
     * - 이미 중단(`ABANDONED`)되었거나 유효기간이 만료된 미노출 세션은 차단합니다.
     */
    fun recordImpression(
        userId: Long,
        sessionToken: String,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AdImpressionResponse {
        val session = adSessionRepository.findBySessionTokenWithLock(sessionToken)
            ?: throw ResourceNotFoundException("광고 세션을 찾을 수 없습니다.")

        if (session.userId != userId) {
            throw ForbiddenException("본인의 광고 세션에만 노출을 기록할 수 있습니다.")
        }

        val firstImpression = session.recordImpression(now)

        // F13: 세션당 최초 노출에서만 기록한다. 반복 호출은 최초 노출 시각을 유지하므로 집계도 늘지 않는다.
        if (firstImpression) {
            redayAnalyticsRecorder.adImpression(
                userId = userId,
                sessionId = session.id,
                dailyRecordId = session.dailyRecordId,
                campaignId = session.campaignId,
                creativeId = session.creativeId
            )
        }

        return AdImpressionResponse(
            sessionId = session.id,
            sessionToken = session.sessionToken,
            status = session.status,
            impressionAt = session.impressionAt ?: now,
            firstImpression = firstImpression,
            expiresAt = session.expiresAt,
            requiredWatchSeconds = session.requiredWatchSeconds
        )
    }

    /**
     * [F09] 광고 시청 중단(`abandon`) 상태 처리
     * - 세션 소유자 본인만 호출 가능 (타인 요청 시 403 Forbidden)
     * - 이미 완료(`COMPLETED`)된 세션은 중단할 수 없으며, 이미 중단된 세션은 멱등하게 반환합니다.
     */
    fun abandonSession(
        userId: Long,
        sessionToken: String,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AdAbandonResponse {
        val session = adSessionRepository.findBySessionTokenWithLock(sessionToken)
            ?: throw ResourceNotFoundException("광고 세션을 찾을 수 없습니다.")

        if (session.userId != userId) {
            throw ForbiddenException("본인의 광고 세션만 중단 처리할 수 있습니다.")
        }

        val alreadyAbandoned = session.status == AdSessionStatus.ABANDONED
        val impressed = session.impressionAt != null
        session.abandon(now)

        // F13: 실제로 중단 상태로 전환된 최초 1회만 기록한다. (멱등 재요청은 집계 제외)
        if (!alreadyAbandoned) {
            redayAnalyticsRecorder.adAbandoned(
                userId = userId,
                sessionId = session.id,
                dailyRecordId = session.dailyRecordId,
                impressed = impressed
            )
        }

        return AdAbandonResponse(
            sessionId = session.id,
            sessionToken = session.sessionToken,
            status = session.status,
            firstAbandon = !alreadyAbandoned,
            abandonedAt = session.abandonedAt ?: now
        )
    }

    /**
     * [F09 & F10] 광고 시청 완료 판정 및 원자적·멱등적 리데이 티켓 1장 지급
     *
     * 1) 비관적 잠금(`findBySessionTokenWithLock`)으로 동시 완료 요청 경합을 직렬화합니다.
     * 2) 세션 소유자 본인인지 검증합니다 (`403 Forbidden`).
     * 3) [멱등성 최우선] 이미 보상이 지급된 세션(`COMPLETED`)에 대한 재요청은
     *    세션 유효기간(`expiresAt`)이 지난 뒤 재시도하더라도 오류 없이 기존 지급 결과를 그대로 반환합니다.
     * 4) 미완료 세션에 대해 실제 노출 존재, 유효기간 미경과, 최소 시청 시간(서버 경과 시간 및 시청 진행 시간) 충족,
     *    중단/만료 상태가 아닌지 검증합니다 (`F09`).
     * 5) 단일 트랜잭션 내에서 `RedayTicket` 1장 발급 + `AdRewardHistory` 1건 생성 + `AdSession.complete`를 원자적으로 처리합니다 (`F10`).
     * 6) 광고 시청 도중 대상 인증 기록의 리데이 기한이 만료되었더라도 유효한 광고 세션의 보상(리데이 티켓 1장)은 정상 지급하여 계정에 남기고,
     *    응답에 대상 기록의 리데이 기한 만료 여부를 함께 안내합니다. (티켓 자동 소비 및 벌금 자동 면제 금지)
     */
    fun completeSessionAndGrantReward(
        userId: Long,
        sessionToken: String,
        request: CompleteAdSessionRequest = CompleteAdSessionRequest(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): CompleteAdSessionResponse {
        val session = adSessionRepository.findBySessionTokenWithLock(sessionToken)
            ?: throw ResourceNotFoundException("광고 세션을 찾을 수 없습니다.")

        // IDOR 방어: 타인 세션 완료/보상 요청 차단
        if (session.userId != userId) {
            throw ForbiddenException("본인의 광고 세션만 완료 및 보상 요청할 수 있습니다.")
        }

        // 멱등성 체크: 이미 보상이 지급된 세션이면 유효기간 경과 여부와 무관하게 기존 결과 그대로 반환
        val existingHistory = adRewardHistoryRepository.findBySessionId(session.id)
        if (existingHistory != null || (session.status == AdSessionStatus.COMPLETED && session.grantedTicketId != null)) {
            val ticketId = existingHistory?.ticketId ?: session.grantedTicketId!!
            val rewardHistoryId = existingHistory?.id ?: 0L
            return buildCompleteResponse(
                session = session,
                newlyGranted = false,
                rewardHistoryId = rewardHistoryId,
                grantedTicketId = ticketId,
                now = now
            )
        }

        // F09: 실제 노출 여부, 유효기간, 최소 시청 시간, 중단/만료 상태 검증
        try {
            session.validateCompletableAt(now, request.watchedSeconds)
        } catch (ex: DayuseException) {
            redayAnalyticsRecorder.recoveryFailed(
                userId = userId,
                dailyRecordId = session.dailyRecordId,
                step = "ad_complete",
                reason = ex.javaClass.simpleName
            )
            throw ex
        }

        // F10: 원자적 보상 지급 (RedayTicket 1장 + AdRewardHistory 1건 + AdSession COMPLETED 전환)
        val existingTicketByRef = redayTicketRepository.findBySourceAndSourceReference(
            source = RedayTicketSource.REWARD_AD,
            sourceReference = session.sessionToken
        )
        val grantedTicket = existingTicketByRef ?: redayTicketRepository.save(
            RedayTicket(
                userId = userId,
                status = RedayTicketStatus.AVAILABLE,
                source = RedayTicketSource.REWARD_AD,
                sourceReference = session.sessionToken
            )
        )

        val rewardHistory = adRewardHistoryRepository.save(
            AdRewardHistory(
                sessionId = session.id,
                sessionToken = session.sessionToken,
                userId = userId,
                dailyRecordId = session.dailyRecordId,
                ticketId = grantedTicket.id,
                grantedAt = now
            )
        )

        session.complete(now = now, ticketId = grantedTicket.id)

        val response = buildCompleteResponse(
            session = session,
            newlyGranted = existingTicketByRef == null,
            rewardHistoryId = rewardHistory.id,
            grantedTicketId = grantedTicket.id,
            now = now
        )

        // F13: 서버가 실제로 최초 지급한 경우에만 기록한다.
        // 재시도는 위 멱등 분기에서 newlyGranted=false로 빠져나가므로 여기까지 오지 않는다.
        if (response.newlyGranted) {
            redayAnalyticsRecorder.adCompletedWithReward(
                userId = userId,
                sessionId = session.id,
                dailyRecordId = session.dailyRecordId,
                campaignId = session.campaignId,
                rewardHistoryId = rewardHistory.id,
                ticketId = grantedTicket.id,
                targetRecordDeadlineExpired = response.targetRecordDeadlineExpired
            )
        }

        return response
    }

    private fun buildCompleteResponse(
        session: AdSession,
        newlyGranted: Boolean,
        rewardHistoryId: Long,
        grantedTicketId: Long,
        now: LocalDateTime
    ): CompleteAdSessionResponse {
        val availableTicketCount = redayTicketRepository.countByUserIdAndStatus(
            session.userId,
            RedayTicketStatus.AVAILABLE
        )

        val targetRecord = dailyRecordRepository.findById(session.dailyRecordId).orElse(null)
        val deadlineExpired = targetRecord != null && !now.isBefore(targetRecord.effectiveRedayDeadline())
        val targetEligible = targetRecord != null &&
            !deadlineExpired &&
            !targetRecord.redayApplied &&
            targetRecord.penaltyStatus == PenaltyStatus.PENDING &&
            !targetRecord.isLocked() &&
            targetRecord.status == DailyRecordStatus.COMPLETED &&
            targetRecord.isLate

        val message = when {
            deadlineExpired -> "리데이 티켓 1장이 지급되었습니다. 단, 대상 인증 기록의 리데이 가능 기한이 지나 해당 기록에는 사용할 수 없으며 티켓은 계정에 보관됩니다."
            targetEligible -> "리데이 티켓 1장이 지급되었습니다. '리데이 티켓 1장 사용하기'를 눌러 벌금을 면제받으세요."
            else -> "리데이 티켓 1장이 지급되었습니다."
        }

        return CompleteAdSessionResponse(
            sessionId = session.id,
            sessionToken = session.sessionToken,
            status = session.status,
            newlyGranted = newlyGranted,
            rewardHistoryId = rewardHistoryId,
            grantedTicketId = grantedTicketId,
            availableTicketCount = availableTicketCount,
            completedAt = session.completedAt ?: now,
            dailyRecordId = session.dailyRecordId,
            targetRecordRedayEligible = targetEligible,
            targetRecordDeadlineExpired = deadlineExpired,
            message = message
        )
    }
}
