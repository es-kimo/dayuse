package com.dayuse.domain.group.service

import com.dayuse.domain.group.Group
import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.group.dto.CreateGroupRequest
import com.dayuse.domain.group.dto.GroupDetailResponse
import com.dayuse.domain.group.dto.GroupMemberItem
import com.dayuse.domain.group.dto.GroupSummaryResponse
import com.dayuse.domain.group.dto.InviteCodeResponse
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
@Transactional(readOnly = true)
class GroupService(
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository
) {

    @Transactional
    fun createGroup(userId: Long, request: CreateGroupRequest): GroupDetailResponse {
        val initialInviteCode = UUID.randomUUID().toString()

        val group = groupRepository.save(
            Group(
                name = request.name,
                hostUserId = userId,
                inviteCode = initialInviteCode
            )
        )

        // 생성자를 HOST 모임원으로 자동 등록
        val hostMember = groupMemberRepository.save(
            GroupMember(
                groupId = group.id,
                userId = userId,
                role = GroupRole.HOST
            )
        )

        val hostUser = userRepository.findById(userId).orElse(null)
        val memberItem = GroupMemberItem(
            id = hostMember.id,
            userId = userId,
            nickname = hostUser?.nickname ?: "모임장",
            profileImageUrl = hostUser?.profileImageUrl,
            role = GroupRole.HOST,
            joinedAt = hostMember.joinedAt
        )

        return GroupDetailResponse(
            id = group.id,
            name = group.name,
            hostUserId = group.hostUserId,
            inviteCode = group.inviteCode,
            inviteCodeIssuedAt = group.inviteCodeIssuedAt,
            isHost = true,
            memberCount = 1,
            members = listOf(memberItem)
        )
    }

    fun getMyGroups(userId: Long): List<GroupSummaryResponse> {
        val memberships = groupMemberRepository.findAllByUserId(userId)

        return memberships.mapNotNull { membership ->
            val group = groupRepository.findById(membership.groupId).orElse(null) ?: return@mapNotNull null
            val count = groupMemberRepository.countByGroupId(group.id)

            GroupSummaryResponse(
                id = group.id,
                name = group.name,
                hostUserId = group.hostUserId,
                role = membership.role,
                memberCount = count,
                inviteCode = group.inviteCode
            )
        }
    }

    fun getGroupDetail(groupId: Long, userId: Long): GroupDetailResponse {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("비회원 접근")

        val group = groupRepository.findById(groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: $groupId)")
        }

        val allMembers = groupMemberRepository.findAllByGroupId(groupId)
        val userMap = userRepository.findAllById(allMembers.map { it.userId }).associateBy { it.id }

        val memberItems = allMembers.map { member ->
            val memberUser = userMap[member.userId]
            GroupMemberItem(
                id = member.id,
                userId = member.userId,
                nickname = memberUser?.nickname ?: "탈퇴한 사용자",
                profileImageUrl = memberUser?.profileImageUrl,
                role = member.role,
                joinedAt = member.joinedAt
            )
        }

        return GroupDetailResponse(
            id = group.id,
            name = group.name,
            hostUserId = group.hostUserId,
            inviteCode = group.inviteCode,
            inviteCodeIssuedAt = group.inviteCodeIssuedAt,
            isHost = membership.role == GroupRole.HOST,
            memberCount = memberItems.size,
            members = memberItems
        )
    }

    /**
     * 모임장 전용 초대 코드 재발급
     * 기존 코드는 즉시 덮어씌워져 무효화됨
     */
    @Transactional
    fun refreshInviteCode(groupId: Long, userId: Long): InviteCodeResponse {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버가 아닙니다.")

        if (membership.role != GroupRole.HOST) {
            throw ForbiddenException("모임장(HOST)만 초대 코드를 재발급할 수 있습니다.")
        }

        val group = groupRepository.findById(groupId).orElseThrow {
            ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: $groupId)")
        }

        val newInviteCode = UUID.randomUUID().toString()
        group.refreshInviteCode(newInviteCode)

        return InviteCodeResponse(
            inviteCode = group.inviteCode,
            inviteCodeIssuedAt = group.inviteCodeIssuedAt
        )
    }
}
