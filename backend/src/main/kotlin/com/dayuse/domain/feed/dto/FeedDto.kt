package com.dayuse.domain.feed.dto

import java.time.LocalDate
import java.time.LocalDateTime

data class FeedItemResponse(
    val id: Long,
    val groupId: Long,
    val challengeId: Long,
    val challengeTitle: String,
    val userId: Long,
    val authorNickname: String,
    val authorProfileImageUrl: String?,
    val targetDate: LocalDate,
    val imageUrl: String,
    val comment: String?,
    val isLate: Boolean,
    val commentCount: Int,
    val isMine: Boolean,
    val createdAt: LocalDateTime
)

data class FeedPageResponse(
    val items: List<FeedItemResponse>,
    val pageNumber: Int,
    val pageSize: Int,
    val totalElements: Long,
    val totalPages: Int,
    val hasNext: Boolean
)
