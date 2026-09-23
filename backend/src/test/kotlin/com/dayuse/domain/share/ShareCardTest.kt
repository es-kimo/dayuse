@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.share

import com.dayuse.global.exception.ForbiddenException
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test

class ShareCardTest {

    @Test
    @DisplayName("공유 카드를 비활성화하면 isActive가 false가 된다")
    fun deactivateShareCard() {
        val card = ShareCard(
            token = "test-token",
            cardType = ShareCardType.TODAY_VERIFICATION,
            userId = 1L,
            challengeId = 1L,
            title = "운동하기",
            userNickname = "러너",
            isActive = true
        )

        assertTrue(card.isActive)
        card.deactivate()
        assertFalse(card.isActive)
    }

    @Test
    @DisplayName("본인이 아닌 사용자가 소유권을 검증하면 ForbiddenException이 발생한다")
    fun validateOwnerThrowsWhenNotOwner() {
        val card = ShareCard(
            token = "test-token",
            cardType = ShareCardType.TODAY_VERIFICATION,
            userId = 1L,
            challengeId = 1L,
            title = "운동하기",
            userNickname = "러너",
            isActive = true
        )

        assertThrows(ForbiddenException::class.java) {
            card.validateOwner(999L)
        }
    }
}
