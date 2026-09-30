package com.dayuse.domain.analytics

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDateTime

interface ProductEventRepository : JpaRepository<ProductEvent, Long> {
    fun existsByEventId(eventId: String): Boolean
    fun findByEventId(eventId: String): ProductEvent?

    /**
     * 기간 내 전체 이벤트 수와 고유 사용자 수를 한 번에 센다.
     * 전체 수는 COUNT(e), 고유 사용자 수는 COUNT(DISTINCT e.userId)로 분리해
     * 한 사용자가 같은 이벤트를 여러 번 발생시켜도 두 수치가 섞이지 않는다.
     *
     * @return [전체 이벤트 수, 고유 사용자 수] 한 행
     */
    @Query(
        """
        SELECT COUNT(e), COUNT(DISTINCT e.userId)
        FROM ProductEvent e
        WHERE e.occurredAt >= :startInclusive
          AND e.occurredAt < :endExclusive
          AND (:eventName IS NULL OR e.eventName = :eventName)
        """
    )
    fun aggregateTotals(
        @Param("startInclusive") startInclusive: LocalDateTime,
        @Param("endExclusive") endExclusive: LocalDateTime,
        @Param("eventName") eventName: String?
    ): List<Array<Any>>

    /**
     * eventName별 발생 수와 고유 사용자 수.
     *
     * @return [eventName, 발생 수, 고유 사용자 수] 행 목록
     */
    @Query(
        """
        SELECT e.eventName, COUNT(e), COUNT(DISTINCT e.userId)
        FROM ProductEvent e
        WHERE e.occurredAt >= :startInclusive
          AND e.occurredAt < :endExclusive
          AND (:eventName IS NULL OR e.eventName = :eventName)
        GROUP BY e.eventName
        ORDER BY COUNT(e) DESC, e.eventName ASC
        """
    )
    fun aggregateByEventName(
        @Param("startInclusive") startInclusive: LocalDateTime,
        @Param("endExclusive") endExclusive: LocalDateTime,
        @Param("eventName") eventName: String?
    ): List<Array<Any>>

    /**
     * 일자별 발생 추이. occurredAt(행동 발생 시각) 기준으로 날짜만 잘라 묶는다.
     *
     * @return [일자, 발생 수, 고유 사용자 수] 행 목록
     */
    @Query(
        """
        SELECT CAST(e.occurredAt AS date), COUNT(e), COUNT(DISTINCT e.userId)
        FROM ProductEvent e
        WHERE e.occurredAt >= :startInclusive
          AND e.occurredAt < :endExclusive
          AND (:eventName IS NULL OR e.eventName = :eventName)
        GROUP BY CAST(e.occurredAt AS date)
        ORDER BY CAST(e.occurredAt AS date) ASC
        """
    )
    fun aggregateDailyTrend(
        @Param("startInclusive") startInclusive: LocalDateTime,
        @Param("endExclusive") endExclusive: LocalDateTime,
        @Param("eventName") eventName: String?
    ): List<Array<Any>>

    /**
     * 퍼널 계산용 원재료. 사용자·이벤트별 최초 발생 시각만 뽑는다.
     *
     * 행 수가 (참여 사용자 수 × 퍼널 단계 수)로 묶여 나오므로 원본 이벤트를 전부 끌어오지 않고도
     * 단계 간 순서(앞 단계 이후에 다음 단계가 일어났는지)를 판정할 수 있다.
     *
     * @return [userId, eventName, 최초 발생 시각] 행 목록
     */
    @Query(
        """
        SELECT e.userId, e.eventName, MIN(e.occurredAt)
        FROM ProductEvent e
        WHERE e.occurredAt >= :startInclusive
          AND e.occurredAt < :endExclusive
          AND e.eventName IN :eventNames
        GROUP BY e.userId, e.eventName
        """
    )
    fun findFirstOccurrencesByUserAndEvent(
        @Param("startInclusive") startInclusive: LocalDateTime,
        @Param("endExclusive") endExclusive: LocalDateTime,
        @Param("eventNames") eventNames: Collection<String>
    ): List<Array<Any>>

    fun findAllByEventNameInOrderByOccurredAtAscIdAsc(eventNames: Collection<String>): List<ProductEvent>
}
