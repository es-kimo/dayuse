package com.dayuse.domain.share.dto

import com.dayuse.domain.share.ShareCard
import com.dayuse.domain.share.ShareCardType
import java.time.LocalDateTime

data class ShareCardResponse(
    val id: Long,
    val token: String,
    val cardType: ShareCardType,
    val challengeId: Long,
    val verificationId: Long?,
    val title: String,
    val userNickname: String,
    val imageUrl: String?,
    val comment: String?,
    val streakDays: Int,
    val historyJson: String?,
    val createdAt: LocalDateTime
) {
    companion object {
        fun from(card: ShareCard, imageUrl: String? = card.imageUrl): ShareCardResponse {
            return ShareCardResponse(
                id = card.id,
                token = card.token,
                cardType = card.cardType,
                challengeId = card.challengeId,
                verificationId = card.verificationId,
                title = card.title,
                userNickname = card.userNickname,
                imageUrl = imageUrl,
                comment = card.comment,
                streakDays = card.streakDays,
                historyJson = card.historyJson,
                createdAt = card.createdAt
            )
        }
    }
}
