package com.dayuse.domain.announcement

import com.dayuse.global.util.DateTimeUtils
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

/**
 * 계정(`user_id`) × 소식(`announcement_id`) 단위의 읽음·닫기 상태 엔티티 (v0.12 F05).
 *
 * ### 설계 원칙
 * 1. **복합 유니크 제약조건**: `(user_id, announcement_id)` 조합은 유일하며 중복 요청 시에도 멱등하게 처리한다.
 * 2. **읽음(`readAt`)과 닫기(`dismissedAt`) 분리**:
 *    - 홈 카드나 인라인 안내에서 `닫기`를 누르면 `dismissedAt`만 기록되고 `readAt`은 `null`로 유지된다.
 *    - 닫은 소식은 홈·인라인 안내 및 미확인 점(Dot)에서는 제외되지만,
 *      새로운 소식 목록에서는 여전히 `읽지 않은 소식`(`isRead == false`)으로 조회 및 열람할 수 있다.
 *    - 상세 화면 열람 또는 유효한 실행 버튼 이동 시 `readAt`을 기록한다.
 */
@Entity
@Table(
    name = "announcement_user_states",
    uniqueConstraints = [
        UniqueConstraint(
            name = "uk_announcement_user_state_user_announcement",
            columnNames = ["user_id", "announcement_id"]
        )
    ],
    indexes = [
        Index(
            name = "idx_announcement_user_state_user_id",
            columnList = "user_id"
        )
    ]
)
class AnnouncementUserState(
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0L,

    @Column(name = "user_id", nullable = false, updatable = false)
    val userId: Long,

    @Column(name = "announcement_id", nullable = false, updatable = false)
    val announcementId: Long,

    @Column(name = "read_at")
    var readAt: LocalDateTime? = null,

    @Column(name = "dismissed_at")
    var dismissedAt: LocalDateTime? = null,

    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: LocalDateTime = DateTimeUtils.nowKst(),

    @Column(name = "updated_at", nullable = false)
    var updatedAt: LocalDateTime = createdAt
) {

    val isRead: Boolean
        get() = readAt != null

    val isDismissed: Boolean
        get() = dismissedAt != null

    /**
     * 소식을 읽음 처리한다 (상세 열람 또는 유효한 실행 버튼 이동 시). (F05)
     *
     * 이미 읽음 처리된 소식에 중복 호출되더라도 최초 `readAt` 시각을 그대로 보존(멱등)한다.
     * 기존 `dismissedAt` 상태는 변경하지 않는다.
     */
    fun markRead(now: LocalDateTime = DateTimeUtils.nowKst()) {
        // TODO [사용자 미션 2-1]: 읽음(readAt) 상태를 멱등하게 기록하세요.
        // - 이미 readAt이 기록되어 있다면 최초 시각을 덮어쓰지 않고 유지합니다.
        // - readAt이 null일 때만 readAt = now, updatedAt = now 로 갱신하며, dismissedAt은 건드리지 않습니다.
    }

    /**
     * 홈 카드 또는 인라인 안내에서 소식을 닫기 처리한다. (F05)
     *
     * 이미 닫기 처리된 소식에 중복 호출되더라도 최초 `dismissedAt` 시각을 그대로 보존(멱등)한다.
     * 닫기는 읽음(`readAt`)과 별개이므로 `readAt`을 기록하지 않는다.
     */
    fun markDismissed(now: LocalDateTime = DateTimeUtils.nowKst()) {
        // TODO [사용자 미션 2-2]: 닫기(dismissedAt) 상태를 읽음(readAt)과 분리하여 멱등하게 기록하세요.
        // - 이미 dismissedAt이 기록되어 있다면 최초 시각을 유지합니다.
        // - dismissedAt이 null일 때만 dismissedAt = now, updatedAt = now 로 갱신하며, readAt은 절대 변경하지 않습니다.
    }
}
