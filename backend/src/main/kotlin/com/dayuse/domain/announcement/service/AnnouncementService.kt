package com.dayuse.domain.announcement.service

import com.dayuse.domain.announcement.Announcement
import com.dayuse.domain.announcement.AnnouncementPlacement
import com.dayuse.domain.announcement.AnnouncementRepository
import com.dayuse.domain.announcement.AnnouncementStatus
import com.dayuse.domain.announcement.AnnouncementUserState
import com.dayuse.domain.announcement.AnnouncementUserStateRepository
import com.dayuse.domain.announcement.dto.AnnouncementAdminResponse
import com.dayuse.domain.announcement.dto.AnnouncementPlacementNoticeResponse
import com.dayuse.domain.announcement.dto.AnnouncementPublishRequest
import com.dayuse.domain.announcement.dto.AnnouncementUnreadDotResponse
import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.dto.AnnouncementUserDetailResponse
import com.dayuse.domain.announcement.dto.AnnouncementUserItemResponse
import com.dayuse.domain.announcement.dto.AnnouncementUserStateResponse
import com.dayuse.global.exception.ResourceNotFoundException
import com.dayuse.global.util.DateTimeUtils
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

/**
 * 새로운 소식 생명주기 관리, 사용자별 읽음·닫기 상태 저장(F05), 적격 소식 및 미확인 점 판정(F06) 서비스.
 */
@Service
class AnnouncementService(
    private val announcementRepository: AnnouncementRepository,
    private val announcementUserStateRepository: AnnouncementUserStateRepository,
    private val featureEligibilityEvaluator: AnnouncementFeatureEligibilityEvaluator
) {

    @Transactional
    fun createDraft(
        actorId: Long,
        request: AnnouncementUpsertRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementAdminResponse {
        val announcement = Announcement.createDraft(
            actorId = actorId,
            title = request.title,
            summary = request.summary,
            body = request.body,
            imageUrl = request.imageUrl,
            imageAlt = request.imageAlt,
            ctaLabel = request.ctaLabel,
            ctaTarget = request.ctaTarget,
            placement = request.placement,
            homeVisible = request.homeVisible,
            featureConditionType = request.featureConditionType,
            featureKey = request.featureKey,
            publishAt = request.publishAt,
            noticeEndsAt = request.noticeEndsAt,
            now = now
        )
        val saved = announcementRepository.save(announcement)
        return AnnouncementAdminResponse.from(saved, now)
    }

    @Transactional
    fun updateAnnouncement(
        actorId: Long,
        announcementId: Long,
        request: AnnouncementUpsertRequest,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementAdminResponse {
        val announcement = findAnnouncementOrThrow(announcementId)
        announcement.updateContent(
            actorId = actorId,
            title = request.title,
            summary = request.summary,
            body = request.body,
            imageUrl = request.imageUrl,
            imageAlt = request.imageAlt,
            ctaLabel = request.ctaLabel,
            ctaTarget = request.ctaTarget,
            placement = request.placement,
            homeVisible = request.homeVisible,
            featureConditionType = request.featureConditionType,
            featureKey = request.featureKey,
            publishAt = request.publishAt ?: announcement.publishAt,
            noticeEndsAt = request.noticeEndsAt ?: announcement.noticeEndsAt,
            now = now
        )
        return AnnouncementAdminResponse.from(announcement, now)
    }

    @Transactional
    fun publishAnnouncement(
        actorId: Long,
        announcementId: Long,
        request: AnnouncementPublishRequest = AnnouncementPublishRequest(),
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementAdminResponse {
        val announcement = findAnnouncementOrThrow(announcementId)
        announcement.publish(
            actorId = actorId,
            requestedPublishAt = request.publishAt,
            requestedNoticeEndsAt = request.noticeEndsAt,
            now = now
        )
        return AnnouncementAdminResponse.from(announcement, now)
    }

    @Transactional
    fun endAnnouncement(
        actorId: Long,
        announcementId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementAdminResponse {
        val announcement = findAnnouncementOrThrow(announcementId)
        announcement.end(actorId = actorId, now = now)
        return AnnouncementAdminResponse.from(announcement, now)
    }

    @Transactional(readOnly = true)
    fun getAdminAnnouncement(
        announcementId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementAdminResponse {
        val announcement = findAnnouncementOrThrow(announcementId)
        return AnnouncementAdminResponse.from(announcement, now)
    }

    @Transactional(readOnly = true)
    fun listAdminAnnouncements(
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): List<AnnouncementAdminResponse> {
        return announcementRepository.findAllByOrderByCreatedAtDescIdDesc()
            .map { AnnouncementAdminResponse.from(it, now) }
    }

    /**
     * 로그인 사용자의 새로운 소식 목록을 조회한다. (F02, F05, F06)
     *
     * - 조건: `status == PUBLISHED` 이고 `publishAt <= now` 이며 사용자의 기능 제공 조건을 충족하는 소식
     * - 안내 기간(`noticeEndsAt`)이 종료된 소식도 게시 종료(`ENDED`) 전까지는 목록에서 계속 조회된다.
     * - 홈/인라인에서 닫은(`dismissed`) 소식도 읽지 않았다면(`isRead == false`) 목록에서 읽지 않은 소식으로 표시된다.
     * - 목록 단순 조회만으로는 읽음(`readAt`) 처리를 하지 않는다.
     * - 정렬: 최신 `publishAt` 내림차순, 동일 시각일 때 `id` 내림차순
     */
    @Transactional(readOnly = true)
    fun listVisibleAnnouncementsForUser(
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): List<AnnouncementUserItemResponse> {
        val visibleAnnouncements = findPublishedAnnouncementsSorted()
            .filter { announcement ->
                announcement.isVisibleInListAndDetail(now) &&
                    featureEligibilityEvaluator.isEligible(userId, announcement)
            }

        if (visibleAnnouncements.isEmpty()) {
            return emptyList()
        }

        val stateByAnnouncementId = loadUserStateMap(userId, visibleAnnouncements.map { it.id })
        return visibleAnnouncements.map { announcement ->
            AnnouncementUserItemResponse.from(
                announcement = announcement,
                userState = stateByAnnouncementId[announcement.id],
                now = now
            )
        }
    }

    /**
     * 로그인 사용자가 특정 소식 상세 화면을 조회한다. (F02, F05, F06)
     *
     * - 초안(`DRAFT`), 예약 미도달(`publishAt > now`), 게시 종료(`ENDED`), 기능 제공 조건 미충족 소식은
     *   일반 사용자에게 노출하지 않으며 `ResourceNotFoundException`으로 차단한다.
     * - 안내 기간(`noticeEndsAt`)만 종료된 소식은 상세 열람이 유지된다.
     * - `markAsReadOnOpen == true`(기본값)이면 정상 열람 시 해당 소식을 읽음(`readAt`) 처리한다.
     */
    @Transactional
    fun getAnnouncementDetailForUser(
        userId: Long,
        announcementId: Long,
        markAsReadOnOpen: Boolean = true,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementUserDetailResponse {
        val announcement = findVisibleAnnouncementForUserOrThrow(
            userId = userId,
            announcementId = announcementId,
            now = now
        )

        val userState = if (markAsReadOnOpen) {
            upsertReadState(userId = userId, announcementId = announcement.id, now = now)
        } else {
            announcementUserStateRepository.findByUserIdAndAnnouncementId(userId, announcement.id)
        }

        return AnnouncementUserDetailResponse.from(
            announcement = announcement,
            userState = userState,
            now = now
        )
    }

    /**
     * 새로운 소식 진입점의 미확인 점(Dot) 표시 여부를 판정한다. (F01, F05, F06)
     *
     * 미확인 점 표시 조건:
     * 1. 게시 중(`status == PUBLISHED`)이고 현재 안내 기간 내(`publishAt <= now < noticeEndsAt`)
     * 2. 사용자의 기능 제공 조건을 충족함
     * 3. 아직 읽지 않았고(`!isRead`) 닫지도 않은(`!isDismissed`) 소식이 1건 이상 존재함
     */
    @Transactional(readOnly = true)
    fun getUnreadDotStatus(
        userId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementUnreadDotResponse {
        // TODO [사용자 미션 3-2]: 새로운 소식 진입점의 미확인 점(Dot) 표시 여부를 판정하세요.
        // 조건:
        // 1) findPublishedAnnouncementsSorted() 중에서 현재 안내 기간 내(isWithinActiveNoticeWindow(now))이고
        //    featureEligibilityEvaluator.isEligible(userId, announcement)를 충족하는 후보를 추립니다.
        // 2) loadUserStateMap(userId, ...)으로 사용자 상태를 조회한 뒤,
        //    아직 읽지 않았고(!isRead) 닫지도 않은(!isDismissed) 소식의 개수를 세어 반환합니다.
        return AnnouncementUnreadDotResponse(hasUnread = false, unreadNoticeCount = 0)
    }

    /**
     * 특정 화면 위치(`HOME`, `CERT_CREATE`)에 표시할 적격 안내 소식을 최대 1건 선택한다. (F03, F04, F06)
     *
     * 선택 조건:
     * 1. 현재 안내 기간 내(`publishAt <= now < noticeEndsAt`) + 게시 중(`PUBLISHED`)
     * 2. 요청한 노출 위치(`HOME` -> `homeVisible == true`, `CERT_CREATE` -> `placement == CERT_CREATE`) 활성
     * 3. 사용자의 기능 제공 조건 충족 (판정 실패 시 조건부 소식은 Fail-Safe로 제외)
     * 4. 미열람(`!isRead`) + 미닫기(`!isDismissed`)
     * 5. 여러 건이면 최신 `publishAt` 내림차순, 동일 시각이면 `id` 내림차순으로 정렬해 **최대 1건**만 반환
     */
    @Transactional(readOnly = true)
    fun getActiveNoticeForPlacement(
        userId: Long,
        placement: AnnouncementPlacement,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementPlacementNoticeResponse {
        // TODO [사용자 미션 3-3]: 요청한 화면 위치(placement)에 노출할 적격 안내 소식을 최대 1건 선택하세요.
        // 조건:
        // 1) findPublishedAnnouncementsSorted() (이미 publishAt DESC, id DESC 정렬됨) 중에서
        //    announcement.isActiveForPlacement(placement, now) 및 featureEligibilityEvaluator.isEligible(userId, announcement)를 만족하는 후보를 필터링합니다.
        // 2) 사용자 상태(loadUserStateMap)에서 미열람(!isRead) && 미닫기(!isDismissed)인 첫 번째(firstOrNull) 소식을 선택해 반환합니다.
        return AnnouncementPlacementNoticeResponse(
            placement = placement,
            announcement = null
        )
    }

    /**
     * 사용자의 소식 읽음(`readAt`) 상태를 멱등하게 기록한다. (F05)
     */
    @Transactional
    fun markAsRead(
        userId: Long,
        announcementId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementUserStateResponse {
        val announcement = findVisibleAnnouncementForUserOrThrow(
            userId = userId,
            announcementId = announcementId,
            now = now
        )
        val state = upsertReadState(userId = userId, announcementId = announcement.id, now = now)
        return AnnouncementUserStateResponse.from(state)
    }

    /**
     * 사용자의 소식 닫기(`dismissedAt`) 상태를 멱등하게 기록한다. (F05)
     *
     * 닫기는 홈 카드 및 인라인 안내, 미확인 점에서만 소식을 숨기며,
     * 읽음(`readAt`) 상태를 변경하지 않으므로 새로운 소식 목록에서는 계속 읽지 않은 소식으로 조회된다.
     */
    @Transactional
    fun markAsDismissed(
        userId: Long,
        announcementId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): AnnouncementUserStateResponse {
        val announcement = findVisibleAnnouncementForUserOrThrow(
            userId = userId,
            announcementId = announcementId,
            now = now
        )
        val state = upsertDismissedState(userId = userId, announcementId = announcement.id, now = now)
        return AnnouncementUserStateResponse.from(state)
    }

    private fun upsertReadState(
        userId: Long,
        announcementId: Long,
        now: LocalDateTime
    ): AnnouncementUserState {
        val existing = announcementUserStateRepository.findByUserIdAndAnnouncementId(userId, announcementId)
        if (existing != null) {
            existing.markRead(now)
            return existing
        }

        return try {
            announcementUserStateRepository.saveAndFlush(
                AnnouncementUserState(
                    userId = userId,
                    announcementId = announcementId,
                    readAt = now,
                    dismissedAt = null,
                    createdAt = now,
                    updatedAt = now
                )
            )
        } catch (ex: DataIntegrityViolationException) {
            val concurrent = announcementUserStateRepository.findByUserIdAndAnnouncementId(userId, announcementId)
                ?: throw ex
            concurrent.markRead(now)
            concurrent
        }
    }

    private fun upsertDismissedState(
        userId: Long,
        announcementId: Long,
        now: LocalDateTime
    ): AnnouncementUserState {
        val existing = announcementUserStateRepository.findByUserIdAndAnnouncementId(userId, announcementId)
        if (existing != null) {
            existing.markDismissed(now)
            return existing
        }

        return try {
            announcementUserStateRepository.saveAndFlush(
                AnnouncementUserState(
                    userId = userId,
                    announcementId = announcementId,
                    readAt = null,
                    dismissedAt = now,
                    createdAt = now,
                    updatedAt = now
                )
            )
        } catch (ex: DataIntegrityViolationException) {
            val concurrent = announcementUserStateRepository.findByUserIdAndAnnouncementId(userId, announcementId)
                ?: throw ex
            concurrent.markDismissed(now)
            concurrent
        }
    }

    private fun findPublishedAnnouncementsSorted(): List<Announcement> {
        return announcementRepository
            .findAllByStatusOrderByPublishAtDescIdDesc(AnnouncementStatus.PUBLISHED)
            .sortedWith(
                compareByDescending<Announcement> { it.publishAt }
                    .thenByDescending { it.id }
            )
    }

    private fun loadUserStateMap(
        userId: Long,
        announcementIds: Collection<Long>
    ): Map<Long, AnnouncementUserState> {
        if (announcementIds.isEmpty()) {
            return emptyMap()
        }
        return announcementUserStateRepository
            .findAllByUserIdAndAnnouncementIdIn(userId, announcementIds)
            .associateBy { it.announcementId }
    }

    private fun findAnnouncementOrThrow(announcementId: Long): Announcement {
        return announcementRepository.findById(announcementId)
            .orElseThrow {
                ResourceNotFoundException("소식을 찾을 수 없습니다: id=$announcementId")
            }
    }

    private fun findVisibleAnnouncementForUserOrThrow(
        userId: Long,
        announcementId: Long,
        now: LocalDateTime
    ): Announcement {
        val announcement = findAnnouncementOrThrow(announcementId)
        if (!announcement.isVisibleInListAndDetail(now)) {
            throw ResourceNotFoundException("더 이상 제공되지 않거나 열람할 수 없는 소식입니다: id=$announcementId")
        }
        if (!featureEligibilityEvaluator.isEligible(userId, announcement)) {
            throw ResourceNotFoundException("현재 사용할 수 없는 기능에 대한 소식입니다: id=$announcementId")
        }
        return announcement
    }
}
