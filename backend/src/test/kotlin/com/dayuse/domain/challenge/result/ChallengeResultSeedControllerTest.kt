package com.dayuse.domain.challenge.result

import com.dayuse.domain.challenge.result.controller.ChallengeResultSeedController
import com.dayuse.domain.challenge.result.service.ChallengeResultService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.DisplayName
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChallengeResultSeedControllerTest {

    @Autowired
    private lateinit var seedController: ChallengeResultSeedController

    @Autowired
    private lateinit var challengeResultService: ChallengeResultService

    @Autowired
    private lateinit var userRepository: UserRepository

    @Test
    @DisplayName("seedEndedChallenges 호출 시 사용자를 위한 4가지 샘플 종료 챌린지 데이터가 즉시 생성된다")
    fun seedEndedChallenges_success() {
        val testUser = userRepository.save(User(kakaoId = "k-seed-test", nickname = "시드테스터", profileImageUrl = null))

        val response = seedController.seedEndedChallenges(testUser.id)
        assertThat(response.statusCode.is2xxSuccessful).isTrue()
        assertThat(response.body?.createdCount).isEqualTo(4)

        // 요약 조회 시 미확인 건수 3건 (완주 1건 + 일부 1건 + 중단 1건, 잠정 1건은 확정 전이므로 미확인 카운트 미포함)
        val summary = challengeResultService.getEndedChallengesSummary(testUser.id)
        assertThat(summary.items).hasSize(4)
        assertThat(summary.unacknowledgedCount).isEqualTo(3)
    }
}
