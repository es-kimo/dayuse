package com.dayuse.domain.share

import org.springframework.data.jpa.repository.JpaRepository

interface ShareCardRepository : JpaRepository<ShareCard, Long> {
    fun findByToken(token: String): ShareCard?
    fun findAllByVerificationIdAndIsActiveTrue(verificationId: Long): List<ShareCard>
    fun findByVerificationIdAndIsActiveTrue(verificationId: Long): ShareCard?
    fun findByChallengeIdAndUserIdAndCardTypeAndIsActiveTrue(
        challengeId: Long,
        userId: Long,
        cardType: ShareCardType
    ): ShareCard?
}
