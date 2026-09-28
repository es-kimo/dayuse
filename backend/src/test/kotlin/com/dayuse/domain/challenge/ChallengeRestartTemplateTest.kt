@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain.challenge

import com.dayuse.domain.challenge.dto.ChallengeRestartTemplateResponse
import com.dayuse.domain.challenge.service.ChallengeService
import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.util.DateTimeUtils
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ChallengeRestartTemplateTest {

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupRepository: GroupRepository

    @Autowired
    private lateinit var groupMemberRepository: GroupMemberRepository

    @Autowired
    private lateinit var challengeRepository: ChallengeRepository

    @Autowired
    private lateinit var challengeParticipantRepository: ChallengeParticipantRepository

    @Autowired
    private lateinit var challengeService: ChallengeService

    private lateinit var user: User
    private lateinit var group: Group

    @BeforeEach
    fun setUp() {
        user = userRepository.save(User(kakaoId = "restart_user", nickname = "재시작러"))
        group = groupRepository.save(
            Group(name = "재시작 모임", hostUserId = user.id, inviteCode = "RESTART-TEST")
        )
        groupMemberRepository.save(
            GroupMember(groupId = group.id, userId = user.id, role = GroupRole.HOST)
        )
    }

    @Test
    fun `중단되거나 종료된 챌린지로부터 도메인 설정만 복제되고 런타임 상태가 초기화된 템플릿을 반환한다`() {
        val today = DateTimeUtils.todayKst()

        val challenge = challengeRepository.save(
            Challenge(
                groupId = group.id,
                creatorUserId = user.id,
                title = "매일 아침 스트레칭",
                description = "개운한 아침",
                verificationCriteria = "스트레칭 매트 사진",
                startDate = today.minusDays(10),
                endDate = today.minusDays(4), // 7일간 진행되었던 종료된 챌린지
                periodType = PeriodType.DAILY,
                executionType = ExecutionType.INDIVIDUAL
            )
        )
        challengeParticipantRepository.save(
            ChallengeParticipant(challengeId = challenge.id, userId = user.id, penaltyAmount = 3000)
        )

        val template: ChallengeRestartTemplateResponse = challengeService.getRestartTemplate(
            groupId = group.id,
            challengeId = challenge.id,
            userId = user.id,
            today = today
        )

        assertEquals("매일 아침 스트레칭", template.title)
        assertEquals("개운한 아침", template.description)
        assertEquals("스트레칭 매트 사진", template.verificationCriteria)
        assertEquals(7, template.durationDays, "원본 챌린지 기간(7일)이 durationDays로 복제되어야 합니다.")
        assertEquals(today.plusDays(1), template.suggestedStartDate, "추천 시작일은 오늘 익일이어야 합니다.")
        assertEquals(today.plusDays(7), template.suggestedEndDate, "추천 종료일은 시작일로부터 durationDays 기준이어야 합니다.")
        assertEquals(3000, template.suggestedPenaltyAmount, "이전 참여자의 벌금 약정 금액이 복제되어야 합니다.")
        assertEquals(ExecutionType.INDIVIDUAL, template.executionType)
    }
}
