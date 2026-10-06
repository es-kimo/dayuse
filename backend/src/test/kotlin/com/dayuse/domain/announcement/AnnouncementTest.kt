@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.announcement

import com.dayuse.global.exception.BadRequestException
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import java.time.LocalDateTime

class AnnouncementTest {

    private val baseNow = LocalDateTime.of(2026, 10, 6, 12, 0, 0)

    @Test
    @DisplayName("초안(DRAFT) 생성 시 기본 상태는 DRAFT이며 일반 사용자 목록/상세 및 능동 안내에서 비노출된다")
    fun createDraftAnnouncementDefaults() {
        val draft = Announcement.createDraft(
            actorId = 10L,
            title = "클립보드 이미지 붙여넣기 안내",
            summary = "복사한 이미지를 바로 붙여넣어 빠르게 인증할 수 있어요.",
            body = "이제 인증 작성 화면에서 복사한 이미지를 바로 붙여넣어 첨부할 수 있어요.",
            imageUrl = "/assets/announcements/clipboard.png",
            imageAlt = "클립보드 이미지 붙여넣기 안내 화면",
            ctaLabel = "인증하러 가기",
            ctaTarget = AnnouncementActionTarget.CERT_CREATE,
            placement = AnnouncementPlacement.CERT_CREATE,
            homeVisible = true,
            now = baseNow
        )

        assertEquals(AnnouncementStatus.DRAFT, draft.status)
        assertEquals(AnnouncementDisplayPhase.DRAFT, draft.resolveDisplayPhase(baseNow))
        assertFalse(draft.isVisibleInListAndDetail(baseNow))
        assertFalse(draft.isWithinActiveNoticeWindow(baseNow))
        assertFalse(draft.isActiveForPlacement(AnnouncementPlacement.HOME, baseNow))
        assertFalse(draft.isActiveForPlacement(AnnouncementPlacement.CERT_CREATE, baseNow))
        assertEquals(10L, draft.createdBy)
        assertEquals(10L, draft.updatedBy)
        assertNull(draft.publishedBy)
        assertNull(draft.endedBy)
    }

    @Test
    @DisplayName("publish 호출 시 noticeEndsAt을 생략하면 기본값으로 publishAt + 14일이 설정되고 시각 경계에 따라 노출 단계가 정확히 구분된다")
    fun publishScheduleAndDisplayPhaseBoundaries() {
        val draft = Announcement.createDraft(
            actorId = 1L,
            title = "리데이 티켓 안내",
            summary = "지각 인증 시 리데이 티켓으로 스트릭을 보호할 수 있어요.",
            body = "리데이 티켓을 사용하는 방법과 조건을 확인해 보세요.",
            homeVisible = true,
            placement = AnnouncementPlacement.CERT_CREATE,
            now = baseNow
        )

        val publishAt = baseNow.plusHours(2)
        draft.publish(
            actorId = 2L,
            requestedPublishAt = publishAt,
            requestedNoticeEndsAt = null,
            now = baseNow
        )

        val expectedNoticeEndsAt = publishAt.plusDays(14)
        assertEquals(AnnouncementStatus.PUBLISHED, draft.status)
        assertEquals(publishAt, draft.publishAt)
        assertEquals(expectedNoticeEndsAt, draft.noticeEndsAt)
        assertEquals(2L, draft.publishedBy)

        // 1. 예약 상태 (now < publishAt): 목록/상세 및 능동 안내 모두 비노출
        val beforePublish = publishAt.minusSeconds(1)
        assertEquals(AnnouncementDisplayPhase.SCHEDULED, draft.resolveDisplayPhase(beforePublish))
        assertFalse(draft.isVisibleInListAndDetail(beforePublish))
        assertFalse(draft.isWithinActiveNoticeWindow(beforePublish))

        // 2. 게시 시작 경계 (now == publishAt): 목록/상세 및 능동 안내 모두 노출
        assertEquals(AnnouncementDisplayPhase.ACTIVE_NOTICE, draft.resolveDisplayPhase(publishAt))
        assertTrue(draft.isVisibleInListAndDetail(publishAt))
        assertTrue(draft.isWithinActiveNoticeWindow(publishAt))
        assertTrue(draft.isActiveForPlacement(AnnouncementPlacement.HOME, publishAt))
        assertTrue(draft.isActiveForPlacement(AnnouncementPlacement.CERT_CREATE, publishAt))

        // 3. 안내 종료 직전 (now == noticeEndsAt - 1초): 능동 안내 유지
        val justBeforeNoticeEnd = expectedNoticeEndsAt.minusSeconds(1)
        assertEquals(AnnouncementDisplayPhase.ACTIVE_NOTICE, draft.resolveDisplayPhase(justBeforeNoticeEnd))
        assertTrue(draft.isWithinActiveNoticeWindow(justBeforeNoticeEnd))
        assertTrue(draft.isVisibleInListAndDetail(justBeforeNoticeEnd))

        // 4. 안내 기간 종료 경계 (now == noticeEndsAt): 홈/인라인/미확인 점은 중단하되, 목록/상세 조회는 유지!
        assertEquals(AnnouncementDisplayPhase.NOTICE_EXPIRED, draft.resolveDisplayPhase(expectedNoticeEndsAt))
        assertFalse(draft.isWithinActiveNoticeWindow(expectedNoticeEndsAt))
        assertFalse(draft.isActiveForPlacement(AnnouncementPlacement.HOME, expectedNoticeEndsAt))
        assertFalse(draft.isActiveForPlacement(AnnouncementPlacement.CERT_CREATE, expectedNoticeEndsAt))
        assertTrue(draft.isVisibleInListAndDetail(expectedNoticeEndsAt))
    }

    @Test
    @DisplayName("게시 종료(ENDED) 전환 시 목록/상세를 포함한 모든 노출이 중단되며 다시 게시할 수 없다")
    fun endAnnouncementStopsAllExposureAndPreventsRepublish() {
        val announcement = Announcement.createDraft(
            actorId = 1L,
            title = "종료 테스트 소식",
            summary = "종료 후 재게시 불가 검증",
            body = "본문 내용입니다.",
            homeVisible = true,
            now = baseNow
        )
        announcement.publish(actorId = 1L, requestedPublishAt = baseNow, now = baseNow)

        val endTime = baseNow.plusDays(1)
        announcement.end(actorId = 99L, now = endTime)

        assertEquals(AnnouncementStatus.ENDED, announcement.status)
        assertEquals(AnnouncementDisplayPhase.ENDED, announcement.resolveDisplayPhase(endTime))
        assertFalse(announcement.isVisibleInListAndDetail(endTime))
        assertFalse(announcement.isWithinActiveNoticeWindow(endTime))
        assertEquals(endTime, announcement.endedAt)
        assertEquals(99L, announcement.endedBy)

        // 게시 종료 후 재게시 시도 -> 400 BadRequestException
        assertThrows(BadRequestException::class.java) {
            announcement.publish(
                actorId = 99L,
                requestedPublishAt = endTime.plusHours(1),
                now = endTime
            )
        }

        // 게시 종료 후 수정 시도 -> 400 BadRequestException
        assertThrows(BadRequestException::class.java) {
            announcement.updateContent(
                actorId = 99L,
                title = "수정 시도",
                summary = "수정 요약",
                body = "수정 본문",
                now = endTime
            )
        }
    }

    @Test
    @DisplayName("noticeEndsAt이 publishAt 이전이거나 같으면 예외가 발생한다")
    fun rejectInvalidScheduleWindow() {
        val draft = Announcement.createDraft(
            actorId = 1L,
            title = "시각 검증",
            summary = "요약",
            body = "본문",
            now = baseNow
        )

        assertThrows(BadRequestException::class.java) {
            draft.publish(
                actorId = 1L,
                requestedPublishAt = baseNow,
                requestedNoticeEndsAt = baseNow,
                now = baseNow
            )
        }

        assertThrows(BadRequestException::class.java) {
            draft.publish(
                actorId = 1L,
                requestedPublishAt = baseNow,
                requestedNoticeEndsAt = baseNow.minusMinutes(1),
                now = baseNow
            )
        }
    }

    @Test
    @DisplayName("제목 40자 초과, 요약 100자 초과, 대표 이미지 등록 시 대체 텍스트 누락, 모호한 CTA 문구('확인')를 거부한다")
    fun validateConstraintsOnFields() {
        // 제목 41자
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "가".repeat(41),
                summary = "정상 요약",
                body = "정상 본문"
            )
        }

        // 요약 101자
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "정상 제목",
                summary = "나".repeat(101),
                body = "정상 본문"
            )
        }

        // 이미지 URL만 있고 imageAlt 누락
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "정상 제목",
                summary = "정상 요약",
                body = "정상 본문",
                imageUrl = "/assets/guide.png",
                imageAlt = "   "
            )
        }

        // CTA 문구 '확인' 금지
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "정상 제목",
                summary = "정상 요약",
                body = "정상 본문",
                ctaLabel = "확인",
                ctaTarget = AnnouncementActionTarget.HOME
            )
        }

        // 조건부 소식에 featureKey 누락
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "실험 기능 안내",
                summary = "정상 요약",
                body = "정상 본문",
                featureConditionType = AnnouncementFeatureConditionType.EXPERIMENT_VARIANT_B,
                featureKey = null
            )
        }
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "<script>alert(1)</script>",
            "안녕하세요 <iframe src='https://evil.com'></iframe>",
            "<img src=x onerror=alert(1)>",
            "클릭하세요 [외부이동](https://malicious.example.com)",
            "링크 [실행](javascript:alert(1))"
        ]
    )
    @DisplayName("본문에 임의 HTML/스크립트/임베드 또는 외부 링크가 포함되면 거절한다")
    fun rejectUnsafeHtmlOrExternalLinksInBody(unsafeBody: String) {
        assertThrows(BadRequestException::class.java) {
            Announcement.createDraft(
                actorId = 1L,
                title = "보안 검증",
                summary = "요약",
                body = unsafeBody
            )
        }
    }

    @Test
    @DisplayName("AnnouncementUserState는 읽음(readAt)과 닫기(dismissedAt)를 분리하여 멱등하게 저장한다")
    fun userStateSeparatesReadAndDismissedIdempotently() {
        val state = AnnouncementUserState(
            userId = 7L,
            announcementId = 100L,
            createdAt = baseNow,
            updatedAt = baseNow
        )

        assertFalse(state.isRead)
        assertFalse(state.isDismissed)

        // 1. 닫기 처리 -> dismissedAt만 기록되고 readAt은 여전히 null이어야 함
        val dismissTime = baseNow.plusMinutes(5)
        state.markDismissed(dismissTime)
        assertTrue(state.isDismissed)
        assertEquals(dismissTime, state.dismissedAt)
        assertFalse(state.isRead)
        assertNull(state.readAt)

        // 2. 닫기 중복 호출 시 최초 dismissedAt 시각 유지 (멱등)
        state.markDismissed(dismissTime.plusMinutes(10))
        assertEquals(dismissTime, state.dismissedAt)

        // 3. 이후 상세 열람으로 읽음 처리 -> readAt 기록, 기존 dismissedAt 유지
        val readTime = baseNow.plusMinutes(20)
        state.markRead(readTime)
        assertTrue(state.isRead)
        assertEquals(readTime, state.readAt)
        assertTrue(state.isDismissed)
        assertEquals(dismissTime, state.dismissedAt)

        // 4. 읽음 중복 호출 시 최초 readAt 시각 유지 (멱등)
        state.markRead(readTime.plusMinutes(30))
        assertNotNull(state.readAt)
        assertEquals(readTime, state.readAt)
    }
}
