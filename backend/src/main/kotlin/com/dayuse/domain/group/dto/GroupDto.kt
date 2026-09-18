package com.dayuse.domain.group.dto

import com.dayuse.domain.group.GroupRole
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDateTime

data class CreateGroupRequest(
    @field:NotBlank(message = "모임 이름은 필수입니다.")
    @field:Size(min = 1, max = 50, message = "모임 이름은 1자 이상 50자 이하여야 합니다.")
    val name: String
)

data class GroupSummaryResponse(
    val id: Long,
    val name: String,
    val hostUserId: Long,
    val role: GroupRole,
    val memberCount: Long,
    val inviteCode: String? = null
)

data class GroupMemberItem(
    val id: Long,
    val userId: Long,
    val nickname: String,
    val profileImageUrl: String?,
    val role: GroupRole,
    val joinedAt: LocalDateTime
)

data class GroupDetailResponse(
    val id: Long,
    val name: String,
    val hostUserId: Long,
    val inviteCode: String,
    val inviteCodeIssuedAt: LocalDateTime,
    val isHost: Boolean,
    val memberCount: Int,
    val members: List<GroupMemberItem>
)

data class InviteCodeResponse(
    val inviteCode: String,
    val inviteCodeIssuedAt: LocalDateTime
)

data class InviteInfoResponse(
    val groupId: Long,
    val groupName: String,
    val hostNickname: String,
    val memberCount: Long,
    val inviteCode: String
)

data class JoinGroupResponse(
    val groupId: Long,
    val message: String = "모임에 성공적으로 참여하였습니다."
)
