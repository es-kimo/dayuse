package com.dayuse.domain.announcement

/**
 * 소식 저장 상태 (F06, F07).
 *
 * - [DRAFT]: 초안 상태. 관리자만 조회·편집할 수 있으며 일반 사용자에게는 절대 노출하지 않는다.
 * - [PUBLISHED]: 게시/예약 확정 상태. `publishAt > now`이면 예약 상태(`SCHEDULED`),
 *   `publishAt <= now`이면 실제 사용자 조회 가능 상태다.
 * - [ENDED]: 게시 종료 상태. 목록·상세를 포함한 모든 사용자 노출을 중단하며 다시 게시할 수 없다.
 */
enum class AnnouncementStatus {
    DRAFT,
    PUBLISHED,
    ENDED
}

/**
 * 서버 KST 현재 시각(`now`)을 반영하여 계산된 소식의 파생 노출 단계 (F06).
 *
 * 안내 기간 종료([NOTICE_EXPIRED])와 게시 종료([ENDED])는 엄격히 구분된다:
 * - [DRAFT]: 초안 (`status == DRAFT`) — 관리자 전용
 * - [SCHEDULED]: 예약 (`status == PUBLISHED && now < publishAt`) — 아직 게시 시각 미도달, 일반 사용자 비노출
 * - [ACTIVE_NOTICE]: 안내 기간 중 (`status == PUBLISHED && publishAt <= now < noticeEndsAt`) —
 *   홈 카드·인라인 안내·미확인 점 표시 대상이며 목록·상세 조회도 가능
 * - [NOTICE_EXPIRED]: 안내 기간 종료 (`status == PUBLISHED && now >= noticeEndsAt`) —
 *   홈 카드·인라인 안내·미확인 점 표시는 중단하되, 새로운 소식 목록·상세 조회는 계속 유지
 * - [ENDED]: 게시 종료 (`status == ENDED`) — 목록·상세를 포함한 모든 사용자 노출 중단
 */
enum class AnnouncementDisplayPhase {
    DRAFT,
    SCHEDULED,
    ACTIVE_NOTICE,
    NOTICE_EXPIRED,
    ENDED;

    /** 일반 사용자가 새로운 소식 목록·상세에서 열람할 수 있는 단계인지 여부. */
    fun isVisibleInListAndDetail(): Boolean =
        this == ACTIVE_NOTICE || this == NOTICE_EXPIRED

    /** 홈 카드·인라인 안내·진입점 미확인 점(Dot) 등 능동적 안내 대상 단계인지 여부. */
    fun isWithinActiveNoticeWindow(): Boolean =
        this == ACTIVE_NOTICE
}

/**
 * 사전에 정의된 소식 노출 화면 위치 (F03, F04, F06).
 *
 * - [HOME]: 로그인 홈 화면 안내 카드 (`Announcement.homeVisible == true`인 소식 대상)
 * - [CERT_CREATE]: 인증 작성 화면 인라인 안내 (`Announcement.placement == CERT_CREATE`인 소식 대상)
 */
enum class AnnouncementPlacement {
    HOME,
    CERT_CREATE;

    companion object {
        fun fromNullable(raw: String?): AnnouncementPlacement? {
            val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
            return entries.firstOrNull { it.name.equals(trimmed, ignoreCase = true) }
        }
    }
}

/**
 * 실행 버튼(CTA)이 이동할 수 있는 사전 정의된 내부 목적지 허용 목록 (F08, 운영 정책 2).
 *
 * 임의 외부 URL(`http://`, `https://`, `javascript:` 등)이나 허용 목록에 없는 경로는 거절한다.
 */
enum class AnnouncementActionTarget(
    val internalPath: String,
    val description: String
) {
    HOME("/", "홈 화면으로 이동"),
    CERT_CREATE("/cert/create", "인증 작성 화면으로 이동"),
    REDAY_HISTORY("/reday/history", "리데이 내역 화면으로 이동"),
    GROUP_CREATE("/groups/create", "모임 생성 화면으로 이동"),
    ANNOUNCEMENT_LIST("/announcements", "새로운 소식 목록으로 이동"),
    MY_PAGE("/mypage", "마이페이지로 이동");

    companion object {
        fun fromCodeOrPath(raw: String?): AnnouncementActionTarget? {
            val trimmed = raw?.trim()?.takeIf { it.isNotEmpty() } ?: return null
            return entries.firstOrNull {
                it.name.equals(trimmed, ignoreCase = true) || it.internalPath == trimmed
            }
        }
    }
}

/**
 * 소식 노출 대상의 기능 제공 조건 유형 (F06).
 *
 * - [ALL_USERS]: 전체 로그인 사용자에게 제공되는 기능 소식
 * - [EXPERIMENT_PARTICIPANT]: 기존 실험(`featureKey`)에 참여 중(`participating == true`)인 사용자에게만 노출
 * - [EXPERIMENT_VARIANT_B]: 기존 실험(`featureKey`)에서 실험군(`participating == true && variant == B`)으로 배정된 사용자에게만 노출
 */
enum class AnnouncementFeatureConditionType {
    ALL_USERS,
    EXPERIMENT_PARTICIPANT,
    EXPERIMENT_VARIANT_B;

    fun requiresFeatureKey(): Boolean = this != ALL_USERS
}
