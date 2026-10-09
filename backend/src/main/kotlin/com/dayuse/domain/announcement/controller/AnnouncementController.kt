package com.dayuse.domain.announcement.controller

import com.dayuse.domain.analytics.service.AnalyticsAccessGuard
import com.dayuse.domain.announcement.AnnouncementPlacement
import com.dayuse.domain.announcement.dto.AnnouncementAdminResponse
import com.dayuse.domain.announcement.dto.AnnouncementPlacementNoticeResponse
import com.dayuse.domain.announcement.dto.AnnouncementPublishRequest
import com.dayuse.domain.announcement.dto.AnnouncementUnreadDotResponse
import com.dayuse.domain.announcement.dto.AnnouncementUpsertRequest
import com.dayuse.domain.announcement.dto.AnnouncementUserDetailResponse
import com.dayuse.domain.announcement.dto.AnnouncementUserItemResponse
import com.dayuse.domain.announcement.dto.AnnouncementUserStateResponse
import com.dayuse.domain.announcement.service.AnnouncementService
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.security.CurrentUserId
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PatchMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/**
 * 새로운 소식 조회·읽음/닫기 상태 저장(F05)·적격 노출 판정(F06) 및 운영 관리 API 컨트롤러.
 */
@RestController
@RequestMapping("/api/v1")
class AnnouncementController(
    private val announcementService: AnnouncementService,
    private val analyticsAccessGuard: AnalyticsAccessGuard
) {

    // =========================================================================
    // 일반 로그인 사용자용 API (F01~F06)
    // =========================================================================

    /**
     * 새로운 소식 진입점 미확인 점(Dot) 표시 여부 조회 (F01, F06).
     */
    @GetMapping("/announcements/unread-dot")
    fun getUnreadDotStatus(
        @CurrentUserId userId: Long
    ): ResponseEntity<AnnouncementUnreadDotResponse> {
        return ResponseEntity.ok(announcementService.getUnreadDotStatus(userId))
    }

    /**
     * 특정 화면 위치(`HOME`, `CERT_CREATE`)의 적격 안내 소식 최대 1건 조회 (F03, F04, F06).
     */
    @GetMapping("/announcements/placements/{placement}")
    fun getPlacementNotice(
        @CurrentUserId userId: Long,
        @PathVariable placement: String
    ): ResponseEntity<AnnouncementPlacementNoticeResponse> {
        val parsedPlacement = AnnouncementPlacement.fromNullable(placement)
            ?: throw BadRequestException("지원하지 않는 소식 노출 위치입니다: $placement")
        return ResponseEntity.ok(
            announcementService.getActiveNoticeForPlacement(
                userId = userId,
                placement = parsedPlacement
            )
        )
    }

    /**
     * 로그인 사용자의 새로운 소식 목록 조회 (F02, F05, F06).
     *
     * 목록 조회만으로는 읽음 처리를 하지 않으며, 안내 기간 종료(`noticeEndsAt` 경과) 소식도
     * 게시 종료(`ENDED`) 전까지는 목록에서 계속 조회된다.
     */
    @GetMapping("/announcements")
    fun listUserAnnouncements(
        @CurrentUserId userId: Long
    ): ResponseEntity<List<AnnouncementUserItemResponse>> {
        return ResponseEntity.ok(announcementService.listVisibleAnnouncementsForUser(userId))
    }

    /**
     * 로그인 사용자의 소식 상세 조회 (F02, F05, F06).
     *
     * 기본적으로 상세 화면 정상 열람 시 해당 소식을 읽음(`readAt`) 처리한다.
     */
    @GetMapping("/announcements/{announcementId}")
    fun getUserAnnouncementDetail(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long,
        @RequestParam(defaultValue = "true") markAsRead: Boolean
    ): ResponseEntity<AnnouncementUserDetailResponse> {
        return ResponseEntity.ok(
            announcementService.getAnnouncementDetailForUser(
                userId = userId,
                announcementId = announcementId,
                markAsReadOnOpen = markAsRead
            )
        )
    }

    /**
     * 소식 읽음(`read`) 상태 멱등 기록 (상세 열람 또는 유효한 실행 버튼 이동 시) (F05).
     */
    @PostMapping("/announcements/{announcementId}/read")
    fun markAsRead(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long
    ): ResponseEntity<AnnouncementUserStateResponse> {
        return ResponseEntity.ok(
            announcementService.markAsRead(
                userId = userId,
                announcementId = announcementId
            )
        )
    }

    /**
     * 소식 닫기(`dismissed`) 상태 멱등 기록 (홈 안내 카드 / 인라인 안내 닫기 시) (F05).
     */
    @PostMapping("/announcements/{announcementId}/dismiss")
    fun markAsDismissed(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long
    ): ResponseEntity<AnnouncementUserStateResponse> {
        return ResponseEntity.ok(
            announcementService.markAsDismissed(
                userId = userId,
                announcementId = announcementId
            )
        )
    }

    // =========================================================================
    // 관리자 전용 운영 API (F06, F07)
    // =========================================================================

    @PostMapping("/admin/announcements")
    fun createDraft(
        @CurrentUserId userId: Long,
        @RequestBody request: AnnouncementUpsertRequest
    ): ResponseEntity<AnnouncementAdminResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        val created = announcementService.createDraft(actorId = userId, request = request)
        return ResponseEntity.status(HttpStatus.CREATED).body(created)
    }

    @GetMapping("/admin/announcements")
    fun listAdminAnnouncements(
        @CurrentUserId userId: Long
    ): ResponseEntity<List<AnnouncementAdminResponse>> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(announcementService.listAdminAnnouncements())
    }

    @GetMapping("/admin/announcements/{announcementId}")
    fun getAdminAnnouncement(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long
    ): ResponseEntity<AnnouncementAdminResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(announcementService.getAdminAnnouncement(announcementId))
    }

    @PutMapping("/admin/announcements/{announcementId}")
    @PatchMapping("/admin/announcements/{announcementId}")
    fun updateAnnouncement(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long,
        @RequestBody request: AnnouncementUpsertRequest
    ): ResponseEntity<AnnouncementAdminResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(
            announcementService.updateAnnouncement(
                actorId = userId,
                announcementId = announcementId,
                request = request
            )
        )
    }

    @PostMapping("/admin/announcements/{announcementId}/publish")
    @PatchMapping("/admin/announcements/{announcementId}/publish")
    fun publishAnnouncement(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long,
        @RequestBody(required = false) request: AnnouncementPublishRequest?
    ): ResponseEntity<AnnouncementAdminResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(
            announcementService.publishAnnouncement(
                actorId = userId,
                announcementId = announcementId,
                request = request ?: AnnouncementPublishRequest()
            )
        )
    }

    @PostMapping("/admin/announcements/{announcementId}/end")
    @PatchMapping("/admin/announcements/{announcementId}/end")
    fun endAnnouncement(
        @CurrentUserId userId: Long,
        @PathVariable announcementId: Long
    ): ResponseEntity<AnnouncementAdminResponse> {
        analyticsAccessGuard.verifyCanReadAnalytics(userId)
        return ResponseEntity.ok(
            announcementService.endAnnouncement(
                actorId = userId,
                announcementId = announcementId
            )
        )
    }
}
