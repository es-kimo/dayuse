// 테스트 시나리오를 한글 이름으로 표현합니다.
@file:Suppress("NonAsciiCharacters")

package com.dayuse.domain

import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.group.dto.CreateGroupRequest
import com.dayuse.domain.group.service.GroupService
import com.dayuse.domain.group.service.InviteService
import com.dayuse.domain.user.User
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.jwt.JwtTokenProvider
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.transaction.annotation.Transactional

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class GroupAndInviteIntegrationTest {

    @Autowired
    private lateinit var mockMvc: MockMvc

    @Autowired
    private lateinit var objectMapper: ObjectMapper

    @Autowired
    private lateinit var userRepository: UserRepository

    @Autowired
    private lateinit var groupService: GroupService

    @Autowired
    private lateinit var inviteService: InviteService

    @Autowired
    private lateinit var jwtTokenProvider: JwtTokenProvider

    private lateinit var hostUser: User
    private lateinit var memberUser: User
    private lateinit var strangerUser: User

    private lateinit var hostToken: String
    private lateinit var memberToken: String
    private lateinit var strangerToken: String

    @BeforeEach
    fun setUp() {
        hostUser = userRepository.save(User(kakaoId = "kakao_host", nickname = "모임장유저"))
        memberUser = userRepository.save(User(kakaoId = "kakao_member", nickname = "참여유저"))
        strangerUser = userRepository.save(User(kakaoId = "kakao_stranger", nickname = "외부유저"))

        hostToken = "Bearer " + jwtTokenProvider.generateAccessToken(hostUser.id)
        memberToken = "Bearer " + jwtTokenProvider.generateAccessToken(memberUser.id)
        strangerToken = "Bearer " + jwtTokenProvider.generateAccessToken(strangerUser.id)
    }

    @Test
    fun `DoD 1 카카오 로그인 API 호출 시 JWT 토큰 및 사용자 정보 반환`() {
        val body = mapOf("code" to "mock-user-10")

        mockMvc.post("/api/v1/auth/kakao") {
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(body)
        }.andExpect {
            status { isOk() }
            jsonPath("$.accessToken") { exists() }
            jsonPath("$.refreshToken") { exists() }
            jsonPath("$.user.nickname") { value("사용자10") }
        }
    }

    @Test
    fun `DoD 2 사용자가 모임을 생성하면 HOST로 등록되고 고유 초대 코드가 발급된다`() {
        val request = CreateGroupRequest(name = "알고리즘 스터디")

        mockMvc.post("/api/v1/groups") {
            header("Authorization", hostToken)
            contentType = MediaType.APPLICATION_JSON
            content = objectMapper.writeValueAsString(request)
        }.andExpect {
            status { isCreated() }
            jsonPath("$.name") { value("알고리즘 스터디") }
            jsonPath("$.isHost") { value(true) }
            jsonPath("$.inviteCode") { exists() }
            jsonPath("$.memberCount") { value(1) }
            jsonPath("$.members[0].role") { value("HOST") }
        }
    }

    @Test
    fun `DoD 3 다른 사용자가 초대 링크를 통해 동일한 모임에 MEMBER로 가입할 수 있다`() {
        val createdGroup = groupService.createGroup(hostUser.id, CreateGroupRequest(name = "러닝 크루"))
        val inviteCode = createdGroup.inviteCode

        // 초대 정보 조회 (Public API)
        mockMvc.get("/api/v1/invites/$inviteCode")
            .andExpect {
                status { isOk() }
                jsonPath("$.groupName") { value("러닝 크루") }
                jsonPath("$.hostNickname") { value("모임장유저") }
                jsonPath("$.memberCount") { value(1) }
            }

        // 새 사용자 가입
        mockMvc.post("/api/v1/invites/$inviteCode/join") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.groupId") { value(createdGroup.id) }
        }

        // 모임 상세에서 멤버 2명 확인
        val detail = groupService.getGroupDetail(createdGroup.id, hostUser.id)
        assertEquals(2, detail.memberCount)
        val joinedMember = detail.members.find { it.userId == memberUser.id }
        assertNotNull(joinedMember)
        assertEquals(GroupRole.MEMBER, joinedMember?.role)
    }

    @Test
    fun `DoD 4 모임장이 초대 링크를 재발급하면 이전 링크는 즉시 무효화되어 404를 반환한다`() {
        val createdGroup = groupService.createGroup(hostUser.id, CreateGroupRequest(name = "독서 모임"))
        val oldInviteCode = createdGroup.inviteCode

        // 모임장이 초대 코드 재발급
        mockMvc.post("/api/v1/groups/${createdGroup.id}/invite-code/refresh") {
            header("Authorization", hostToken)
        }.andExpect {
            status { isOk() }
            jsonPath("$.inviteCode") { exists() }
        }

        // 이전 초대 코드로 조회 시 404 Not Found 확인
        mockMvc.get("/api/v1/invites/$oldInviteCode")
            .andExpect {
                status { isNotFound() }
            }
    }

    @Test
    fun `DoD 5 모임에 가입되지 않은 사용자가 해당 모임에 직접 접근할 경우 403 Forbidden 차단된다`() {
        val createdGroup = groupService.createGroup(hostUser.id, CreateGroupRequest(name = "비공개 프로젝트"))

        // 비회원인 strangerUser가 모임 상세 조회 시도 -> 403 Forbidden
        mockMvc.get("/api/v1/groups/${createdGroup.id}") {
            header("Authorization", strangerToken)
        }.andExpect {
            status { isForbidden() }
        }
    }

    @Test
    fun `일반 모임원이 초대 코드 재발급을 시도하면 403 Forbidden 반환`() {
        val createdGroup = groupService.createGroup(hostUser.id, CreateGroupRequest(name = "스터디"))
        inviteService.joinGroupByInviteCode(createdGroup.inviteCode, memberUser.id)

        // MEMBER 권한으로 재발급 시도 -> 403 Forbidden
        mockMvc.post("/api/v1/groups/${createdGroup.id}/invite-code/refresh") {
            header("Authorization", memberToken)
        }.andExpect {
            status { isForbidden() }
        }
    }
}
