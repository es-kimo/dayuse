package com.dayuse.domain.announcement

import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import java.time.LocalDateTime

/**
 * 서비스 내 새 기능 안내 및 새로운 소식 도메인 엔티티 (v0.12 F05~F09).
 *
 * ### 생명주기 및 시각 정책 (서버 KST 기준)
 * - `DRAFT`: 초안. 관리자만 조회 가능하며 일반 사용자 노출 차단.
 * - `PUBLISHED`: 게시 또는 예약(`publishAt > now`). `publishAt` 도달 시점부터 사용자 조회 가능.
 * - 안내 기간 종료(`now >= noticeEndsAt`): 홈 카드·인라인 안내·미확인 점 표시만 중단하고,
 *   새로운 소식 목록·상세 조회는 그대로 유지한다.
 * - `ENDED`: 게시 종료. 목록·상세를 포함한 모든 사용자 노출을 중단하며, 다시 게시(`PUBLISHED`)로 되돌릴 수 없다.
 *
 * ### 수정 정책
 * - 게시 중(`PUBLISHED`) 문구나 이미지를 수정하더라도 `updatedAt`과 `updatedBy`만 갱신하며,
 *   기존 사용자의 읽음(`readAt`)·닫기(`dismissedAt`) 상태는 초기화하지 않는다.
 */
@Entity
@Table(
    name = "announcements",
    indexes = [
        Index(
            name = "idx_announcements_status_publish_at",
            columnList = "status, publish_at"
        ),
        Index(
            name = "idx_announcements_placement_status",
            columnList = "placement, status"
        )
    ]
)
class Announcement(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(
        name = "title",
        nullable = false,
        length = MAX_TITLE_LENGTH
    )
    var title: String,

    @Column(
        name = "summary",
        nullable = false,
        length = MAX_SUMMARY_LENGTH
    )
    var summary: String,

    @Column(
        name = "body",
        nullable = false,
        columnDefinition = "TEXT"
    )
    var body: String,

    @Column(
        name = "image_url",
        length = 500
    )
    var imageUrl: String? = null,

    @Column(
        name = "image_alt",
        length = MAX_IMAGE_ALT_LENGTH
    )
    var imageAlt: String? = null,

    @Column(
        name = "cta_label",
        length = MAX_CTA_LABEL_LENGTH
    )
    var ctaLabel: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(
        name = "cta_target",
        length = 40
    )
    var ctaTarget: AnnouncementActionTarget? = null,

    @Enumerated(EnumType.STRING)
    @Column(
        name = "placement",
        length = 40
    )
    var placement: AnnouncementPlacement? = null,

    @Column(
        name = "home_visible",
        nullable = false
    )
    var homeVisible: Boolean = false,

    @Enumerated(EnumType.STRING)
    @Column(
        name = "feature_condition_type",
        nullable = false,
        length = 40
    )
    var featureConditionType: AnnouncementFeatureConditionType = AnnouncementFeatureConditionType.ALL_USERS,

    @Column(
        name = "feature_key",
        length = MAX_FEATURE_KEY_LENGTH
    )
    var featureKey: String? = null,

    @Enumerated(EnumType.STRING)
    @Column(
        name = "status",
        nullable = false,
        length = 20
    )
    var status: AnnouncementStatus = AnnouncementStatus.DRAFT,

    @Column(name = "publish_at")
    var publishAt: LocalDateTime? = null,

    @Column(name = "notice_ends_at")
    var noticeEndsAt: LocalDateTime? = null,

    @Column(name = "ended_at")
    var endedAt: LocalDateTime? = null,

    @Column(
        name = "created_by",
        nullable = false,
        updatable = false
    )
    val createdBy: Long,

    @Column(
        name = "updated_by",
        nullable = false
    )
    var updatedBy: Long,

    @Column(name = "published_by")
    var publishedBy: Long? = null,

    @Column(name = "ended_by")
    var endedBy: Long? = null,

    @Column(
        name = "created_at",
        nullable = false,
        updatable = false
    )
    val createdAt: LocalDateTime = DateTimeUtils.nowKst(),

    @Column(
        name = "updated_at",
        nullable = false
    )
    var updatedAt: LocalDateTime = createdAt
) {

    /**
     * 서버 KST 기준 현재 시각(`now`)에서 이 소식의 파생 노출 단계를 판정한다. (F06)
     *
     * - `DRAFT` -> [AnnouncementDisplayPhase.DRAFT]
     * - `ENDED` -> [AnnouncementDisplayPhase.ENDED]
     * - `PUBLISHED` 상태일 때:
     *   - `publishAt`이 없거나 `now < publishAt` -> [AnnouncementDisplayPhase.SCHEDULED]
     *   - `publishAt <= now < noticeEndsAt` -> [AnnouncementDisplayPhase.ACTIVE_NOTICE] (홈/인라인/미확인 점 + 목록/상세 모두 활성)
     *   - `now >= noticeEndsAt` -> [AnnouncementDisplayPhase.NOTICE_EXPIRED] (홈/인라인/미확인 점 중단, 목록/상세는 유지)
     */
    fun resolveDisplayPhase(now: LocalDateTime = DateTimeUtils.nowKst()): AnnouncementDisplayPhase {
        return when (status) {
            AnnouncementStatus.DRAFT -> AnnouncementDisplayPhase.DRAFT
            AnnouncementStatus.ENDED -> AnnouncementDisplayPhase.ENDED
            AnnouncementStatus.PUBLISHED -> {
                val currentPublishAt = publishAt ?: return AnnouncementDisplayPhase.SCHEDULED
                val currentNoticeEndsAt = noticeEndsAt ?: currentPublishAt.plusDays(DEFAULT_NOTICE_DURATION_DAYS)
                when {
                    now.isBefore(currentPublishAt) -> AnnouncementDisplayPhase.SCHEDULED
                    now.isBefore(currentNoticeEndsAt) -> AnnouncementDisplayPhase.ACTIVE_NOTICE
                    else -> AnnouncementDisplayPhase.NOTICE_EXPIRED
                }
            }
        }
    }

    /**
     * 일반 사용자가 새로운 소식 목록 및 상세에서 조회할 수 있는 상태인지 반환한다. (F02, F06)
     *
     * 안내 기간(`noticeEndsAt`)이 지났더라도 게시 종료(`ENDED`)되지 않았다면 목록·상세에서는 계속 조회 가능하다.
     */
    fun isVisibleInListAndDetail(now: LocalDateTime = DateTimeUtils.nowKst()): Boolean {
        return resolveDisplayPhase(now).isVisibleInListAndDetail()
    }

    /**
     * 현재 안내 기간 내(`publishAt <= now < noticeEndsAt`)이며 게시 중인 능동 안내 대상인지 반환한다. (F06)
     */
    fun isWithinActiveNoticeWindow(now: LocalDateTime = DateTimeUtils.nowKst()): Boolean {
        return resolveDisplayPhase(now).isWithinActiveNoticeWindow()
    }

    /**
     * 지정된 노출 위치([targetPlacement])에 대해 현재 시각 기준 능동 안내 후보인지 반환한다. (F03, F04, F06)
     */
    fun isActiveForPlacement(
        targetPlacement: AnnouncementPlacement,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ): Boolean {
        if (!isWithinActiveNoticeWindow(now)) {
            return false
        }
        return when (targetPlacement) {
            AnnouncementPlacement.HOME -> homeVisible
            AnnouncementPlacement.CERT_CREATE -> placement == AnnouncementPlacement.CERT_CREATE
        }
    }

    /**
     * 소식을 즉시 게시(`publishAt <= now`)하거나 예약 게시(`publishAt > now`)로 전환한다. (F06, F07)
     *
     * - 이미 게시 종료(`ENDED`)된 소식은 다시 게시할 수 없다.
     * - `noticeEndsAt`이 생략된 경우 기본값으로 `effectivePublishAt + 14일`을 설정한다.
     * - `noticeEndsAt`은 반드시 `effectivePublishAt` 이후(`noticeEndsAt > publishAt`)여야 한다.
     */
    fun publish(
        actorId: Long,
        requestedPublishAt: LocalDateTime? = null,
        requestedNoticeEndsAt: LocalDateTime? = null,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        requireValidActor(actorId)
        if (status == AnnouncementStatus.ENDED) {
            throw BadRequestException("이미 게시 종료(ENDED)된 소식은 다시 게시할 수 없습니다: id=$id")
        }

        val effectivePublishAt = requestedPublishAt ?: publishAt ?: now
        val effectiveNoticeEndsAt =
            requestedNoticeEndsAt ?: noticeEndsAt ?: effectivePublishAt.plusDays(DEFAULT_NOTICE_DURATION_DAYS)

        validateScheduleWindow(
            effectivePublishAt,
            effectiveNoticeEndsAt
        )

        this.status = AnnouncementStatus.PUBLISHED
        this.publishAt = effectivePublishAt
        this.noticeEndsAt = effectiveNoticeEndsAt
        this.publishedBy = actorId
        this.updatedBy = actorId
        this.updatedAt = now
    }

    /**
     * 소식을 게시 종료(`ENDED`) 상태로 전환한다. (F06, F07)
     *
     * - 초안(`DRAFT`)이거나 이미 종료(`ENDED`)된 소식은 게시 종료할 수 없다.
     * - 종료 시 모든 사용자 노출(목록·상세·홈·인라인·미확인 점)이 중단된다.
     */
    fun end(
        actorId: Long,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        requireValidActor(actorId)
        when (status) {
            AnnouncementStatus.DRAFT -> {
                throw BadRequestException("초안(DRAFT) 상태의 소식은 게시 종료(ENDED)할 수 없습니다: id=$id")
            }

            AnnouncementStatus.ENDED -> {
                throw BadRequestException("이미 게시 종료(ENDED)된 소식입니다: id=$id")
            }

            AnnouncementStatus.PUBLISHED -> {
                this.status = AnnouncementStatus.ENDED
                this.endedAt = now
                this.endedBy = actorId
                this.updatedBy = actorId
                this.updatedAt = now
            }
        }
    }

    /**
     * 소식 콘텐츠 및 노출 설정을 수정한다. (F07, F09)
     *
     * - 게시 종료(`ENDED`)된 소식은 수정할 수 없다.
     * - 게시 중(`PUBLISHED`) 문구나 이미지를 수정하더라도 `updatedAt`과 `updatedBy`만 갱신한다.
     */
    fun updateContent(
        actorId: Long,
        title: String,
        summary: String,
        body: String,
        imageUrl: String? = null,
        imageAlt: String? = null,
        ctaLabel: String? = null,
        ctaTarget: AnnouncementActionTarget? = null,
        placement: AnnouncementPlacement? = null,
        homeVisible: Boolean = false,
        featureConditionType: AnnouncementFeatureConditionType = AnnouncementFeatureConditionType.ALL_USERS,
        featureKey: String? = null,
        publishAt: LocalDateTime? = this.publishAt,
        noticeEndsAt: LocalDateTime? = this.noticeEndsAt,
        now: LocalDateTime = DateTimeUtils.nowKst()
    ) {
        requireValidActor(actorId)
        if (status == AnnouncementStatus.ENDED) {
            throw BadRequestException("이미 게시 종료(ENDED)된 소식은 수정할 수 없습니다: id=$id")
        }

        val validatedTitle = validateTitle(title)
        val validatedSummary = validateSummary(summary)
        val validatedBody = validateSafeBody(body)
        val (validatedImageUrl, validatedImageAlt) = validateImage(
            imageUrl,
            imageAlt
        )
        val (validatedCtaLabel, validatedCtaTarget) = validateCta(
            ctaLabel,
            ctaTarget
        )
        val validatedPlacement = validatePlacement(placement)
        val validatedFeatureKey = validateFeatureCondition(
            featureConditionType,
            featureKey
        )

        val effectivePublishAt = publishAt
        val effectiveNoticeEndsAt = when {
            noticeEndsAt != null -> noticeEndsAt
            effectivePublishAt != null -> effectivePublishAt.plusDays(DEFAULT_NOTICE_DURATION_DAYS)
            else -> null
        }

        if (status == AnnouncementStatus.PUBLISHED && effectivePublishAt == null) {
            throw BadRequestException("게시(PUBLISHED) 상태의 소식은 게시 시각(publishAt)이 필수입니다.")
        }
        if (effectivePublishAt != null && effectiveNoticeEndsAt != null) {
            validateScheduleWindow(
                effectivePublishAt,
                effectiveNoticeEndsAt
            )
        } else if (effectivePublishAt == null && effectiveNoticeEndsAt != null) {
            throw BadRequestException("안내 종료 시각(noticeEndsAt)을 지정하려면 게시 시각(publishAt)도 함께 지정해야 합니다.")
        }

        this.title = validatedTitle
        this.summary = validatedSummary
        this.body = validatedBody
        this.imageUrl = validatedImageUrl
        this.imageAlt = validatedImageAlt
        this.ctaLabel = validatedCtaLabel
        this.ctaTarget = validatedCtaTarget
        this.placement = validatedPlacement
        this.homeVisible = homeVisible
        this.featureConditionType = featureConditionType
        this.featureKey = validatedFeatureKey
        this.publishAt = effectivePublishAt
        this.noticeEndsAt = effectiveNoticeEndsAt
        this.updatedBy = actorId
        this.updatedAt = now
    }

    companion object {
        const val MAX_TITLE_LENGTH = 40
        const val MAX_SUMMARY_LENGTH = 100
        const val MAX_BODY_LENGTH = 5000
        const val MAX_IMAGE_ALT_LENGTH = 120
        const val MAX_CTA_LABEL_LENGTH = 30
        const val MAX_FEATURE_KEY_LENGTH = 64
        const val DEFAULT_NOTICE_DURATION_DAYS = 14L

        private val FORBIDDEN_CTA_LABELS = setOf(
            "확인",
            "ok",
            "okay"
        )
        private val DANGEROUS_HTML_TAG_REGEX = Regex(
            "<\\s*/?\\s*(script|iframe|object|embed|style|link|meta|form|input|button|svg|math)\\b",
            RegexOption.IGNORE_CASE
        )
        private val INLINE_EVENT_HANDLER_REGEX = Regex(
            "\\bon[a-z]+\\s*=",
            RegexOption.IGNORE_CASE
        )
        private val DANGEROUS_URI_SCHEME_REGEX = Regex(
            "(javascript|vbscript|data\\s*:\\s*text/html)\\s*:",
            RegexOption.IGNORE_CASE
        )
        private val RAW_HTML_TAG_REGEX = Regex("<\\s*/?\\s*[a-zA-Z][^>]*>")
        private val EXTERNAL_MARKDOWN_LINK_REGEX = Regex(
            "\\[[^\\]]*]\\(\\s*(https?:|//|javascript:|data:)",
            RegexOption.IGNORE_CASE
        )

        fun createDraft(
            actorId: Long,
            title: String,
            summary: String,
            body: String,
            imageUrl: String? = null,
            imageAlt: String? = null,
            ctaLabel: String? = null,
            ctaTarget: AnnouncementActionTarget? = null,
            placement: AnnouncementPlacement? = null,
            homeVisible: Boolean = false,
            featureConditionType: AnnouncementFeatureConditionType = AnnouncementFeatureConditionType.ALL_USERS,
            featureKey: String? = null,
            publishAt: LocalDateTime? = null,
            noticeEndsAt: LocalDateTime? = null,
            now: LocalDateTime = DateTimeUtils.nowKst()
        ): Announcement {
            requireValidActor(actorId)
            val validatedTitle = validateTitle(title)
            val validatedSummary = validateSummary(summary)
            val validatedBody = validateSafeBody(body)
            val (validatedImageUrl, validatedImageAlt) = validateImage(
                imageUrl,
                imageAlt
            )
            val (validatedCtaLabel, validatedCtaTarget) = validateCta(
                ctaLabel,
                ctaTarget
            )
            val validatedPlacement = validatePlacement(placement)
            val validatedFeatureKey = validateFeatureCondition(
                featureConditionType,
                featureKey
            )

            val resolvedNoticeEndsAt = when {
                noticeEndsAt != null && publishAt != null -> {
                    validateScheduleWindow(
                        publishAt,
                        noticeEndsAt
                    )
                    noticeEndsAt
                }

                noticeEndsAt != null && publishAt == null -> {
                    throw BadRequestException("안내 종료 시각(noticeEndsAt)을 지정하려면 게시 시각(publishAt)도 함께 지정해야 합니다.")
                }

                noticeEndsAt == null && publishAt != null -> {
                    publishAt.plusDays(DEFAULT_NOTICE_DURATION_DAYS)
                }

                else -> null
            }

            return Announcement(
                title = validatedTitle,
                summary = validatedSummary,
                body = validatedBody,
                imageUrl = validatedImageUrl,
                imageAlt = validatedImageAlt,
                ctaLabel = validatedCtaLabel,
                ctaTarget = validatedCtaTarget,
                placement = validatedPlacement,
                homeVisible = homeVisible,
                featureConditionType = featureConditionType,
                featureKey = validatedFeatureKey,
                status = AnnouncementStatus.DRAFT,
                publishAt = publishAt,
                noticeEndsAt = resolvedNoticeEndsAt,
                endedAt = null,
                createdBy = actorId,
                updatedBy = actorId,
                publishedBy = null,
                endedBy = null,
                createdAt = now,
                updatedAt = now
            )
        }

        fun requireValidActor(actorId: Long) {
            if (actorId <= 0L) {
                throw BadRequestException("유효한 처리자 식별자(actorId)가 필요합니다.")
            }
        }

        fun validateTitle(rawTitle: String): String {
            val trimmed = rawTitle.trim()
            if (trimmed.isEmpty() || trimmed.length > MAX_TITLE_LENGTH) {
                throw BadRequestException("소식 제목(title)은 1자 이상 ${MAX_TITLE_LENGTH}자 이하여야 합니다.")
            }
            if (RAW_HTML_TAG_REGEX.containsMatchIn(trimmed)) {
                throw BadRequestException("소식 제목에는 HTML 태그를 포함할 수 없습니다.")
            }
            return trimmed
        }

        fun validateSummary(rawSummary: String): String {
            val trimmed = rawSummary.trim()
            if (trimmed.isEmpty() || trimmed.length > MAX_SUMMARY_LENGTH) {
                throw BadRequestException("소식 요약(summary)은 1자 이상 ${MAX_SUMMARY_LENGTH}자 이하여야 합니다.")
            }
            if (RAW_HTML_TAG_REGEX.containsMatchIn(trimmed)) {
                throw BadRequestException("소식 요약에는 HTML 태그를 포함할 수 없습니다.")
            }
            return trimmed
        }

        fun validateSafeBody(rawBody: String): String {
            val trimmed = rawBody.trim()
            if (trimmed.isEmpty() || trimmed.length > MAX_BODY_LENGTH) {
                throw BadRequestException("소식 본문(body)은 1자 이상 ${MAX_BODY_LENGTH}자 이하여야 합니다.")
            }
            if (
                DANGEROUS_HTML_TAG_REGEX.containsMatchIn(trimmed) ||
                INLINE_EVENT_HANDLER_REGEX.containsMatchIn(trimmed) ||
                DANGEROUS_URI_SCHEME_REGEX.containsMatchIn(trimmed) ||
                RAW_HTML_TAG_REGEX.containsMatchIn(trimmed)
            ) {
                throw BadRequestException("소식 본문에는 임의 HTML 태그나 스크립트/임베드를 포함할 수 없습니다.")
            }
            if (EXTERNAL_MARKDOWN_LINK_REGEX.containsMatchIn(trimmed)) {
                throw BadRequestException("소식 본문에는 허용되지 않은 외부 링크를 포함할 수 없습니다.")
            }
            return trimmed
        }

        fun validateImage(
            rawImageUrl: String?,
            rawImageAlt: String?
        ): Pair<String?, String?> {
            val cleanedUrl = rawImageUrl?.trim()?.takeIf { it.isNotEmpty() }
            val cleanedAlt = rawImageAlt?.trim()?.takeIf { it.isNotEmpty() }

            if (cleanedUrl == null) {
                return null to null
            }

            if (
                cleanedUrl.startsWith(
                    "javascript:",
                    ignoreCase = true
                ) ||
                cleanedUrl.startsWith(
                    "data:",
                    ignoreCase = true
                ) ||
                cleanedUrl.startsWith(
                    "vbscript:",
                    ignoreCase = true
                ) ||
                (!cleanedUrl.startsWith("/") && !cleanedUrl.startsWith("https://") && !cleanedUrl.startsWith("http://localhost"))
            ) {
                throw BadRequestException("대표 이미지 URL은 허용된 경로(/... 또는 안전한 이미지 URL)여야 합니다.")
            }

            if (cleanedAlt == null) {
                throw BadRequestException("대표 이미지를 등록할 때는 정보성 이미지 대체 텍스트(imageAlt)가 필수입니다.")
            }
            if (cleanedAlt.length > MAX_IMAGE_ALT_LENGTH) {
                throw BadRequestException("이미지 대체 텍스트(imageAlt)는 ${MAX_IMAGE_ALT_LENGTH}자 이하여야 합니다.")
            }
            if (RAW_HTML_TAG_REGEX.containsMatchIn(cleanedAlt)) {
                throw BadRequestException("이미지 대체 텍스트에는 HTML 태그를 포함할 수 없습니다.")
            }

            return cleanedUrl to cleanedAlt
        }

        fun validateCta(
            rawCtaLabel: String?,
            ctaTarget: AnnouncementActionTarget?
        ): Pair<String?, AnnouncementActionTarget?> {
            val cleanedLabel = rawCtaLabel?.trim()?.takeIf { it.isNotEmpty() }
            if (cleanedLabel == null && ctaTarget == null) {
                return null to null
            }
            if (cleanedLabel == null || ctaTarget == null) {
                throw BadRequestException("실행 버튼 설정 시 버튼 문구(ctaLabel)와 내부 목적지(ctaTarget)를 모두 지정해야 합니다.")
            }
            if (cleanedLabel.length > MAX_CTA_LABEL_LENGTH) {
                throw BadRequestException("실행 버튼 문구(ctaLabel)는 ${MAX_CTA_LABEL_LENGTH}자 이하여야 합니다.")
            }
            if (cleanedLabel.lowercase() in FORBIDDEN_CTA_LABELS) {
                throw BadRequestException("실행 버튼 문구는 '확인' 대신 구체적인 다음 행동(예: '인증하러 가기')을 표시해야 합니다.")
            }
            if (RAW_HTML_TAG_REGEX.containsMatchIn(cleanedLabel)) {
                throw BadRequestException("실행 버튼 문구에는 HTML 태그를 포함할 수 없습니다.")
            }
            return cleanedLabel to ctaTarget
        }

        fun validatePlacement(placement: AnnouncementPlacement?): AnnouncementPlacement? {
            if (placement == AnnouncementPlacement.HOME) {
                throw BadRequestException("홈 노출 여부는 homeVisible 플래그로 설정하며, placement 필드에는 CERT_CREATE 등 관련 화면 위치만 지정할 수 있습니다.")
            }
            return placement
        }

        fun validateFeatureCondition(
            conditionType: AnnouncementFeatureConditionType,
            rawFeatureKey: String?
        ): String? {
            val cleanedKey = rawFeatureKey?.trim()?.takeIf { it.isNotEmpty() }
            if (conditionType == AnnouncementFeatureConditionType.ALL_USERS) {
                return cleanedKey
            }
            if (cleanedKey == null) {
                throw BadRequestException("조건부 기능 소식($conditionType)에는 연결 기능 식별자(featureKey)가 필수입니다.")
            }
            if (cleanedKey.length > MAX_FEATURE_KEY_LENGTH) {
                throw BadRequestException("featureKey는 ${MAX_FEATURE_KEY_LENGTH}자 이하여야 합니다.")
            }
            return cleanedKey
        }

        fun validateScheduleWindow(
            publishAt: LocalDateTime,
            noticeEndsAt: LocalDateTime
        ) {
            if (!noticeEndsAt.isAfter(publishAt)) {
                throw BadRequestException(
                    "안내 종료 시각(noticeEndsAt)은 게시 시각(publishAt) 이후여야 합니다. " +
                            "(publishAt=$publishAt, noticeEndsAt=$noticeEndsAt)"
                )
            }
        }
    }
}
