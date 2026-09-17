package com.dayuse.domain.group.service

import com.dayuse.domain.group.GroupMember
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.group.dto.InviteInfoResponse
import com.dayuse.domain.group.dto.JoinGroupResponse
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class InviteService(
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository
) {

    /**
     * 초대 코드 유효성 검증 및 모임 기본 정보 조회
     * 모임장이 코드를 재발급하면 이전 코드는 findByInviteCode에서 조회되지 않아 404를 반환
     */
    fun getInviteInfo(inviteCode: String): InviteInfoResponse {
        val group = groupRepository.findByInviteCode(inviteCode)
            ?: throw ResourceNotFoundException("유효하지 않거나 만료된 초대 코드입니다.")

        val hostUser = userRepository.findById(group.hostUserId).orElse(null)
        val memberCount = groupMemberRepository.countByGroupId(group.id)

        return InviteInfoResponse(
            groupId = group.id,
            groupName = group.name,
            hostNickname = hostUser?.nickname ?: "모임장",
            memberCount = memberCount,
            inviteCode = group.inviteCode
        )
    }

    /**
     * [사용자 미션 3 관련 모임 중복 가입 방어 로직]
     * 초대 코드로 모임원(MEMBER) 가입
     * 애플리케이션 레벨 exists 검사와 DB uk_group_user 복합 유니크 제약조건을 통한 이중 방어
     */
    @Transactional
    fun joinGroupByInviteCode(inviteCode: String, userId: Long): JoinGroupResponse {
        val group = groupRepository.findByInviteCode(inviteCode)
            ?: throw ResourceNotFoundException("유효하지 않거나 만료된 초대 코드입니다.")

        // 1차: 애플리케이션 레벨 중복 가입 체크
        if (groupMemberRepository.existsByGroupIdAndUserId(group.id, userId)) {
            return JoinGroupResponse(groupId = group.id, message = "이미 참여 중인 모임입니다.")
        }

        // 2차: DB 레벨 복합 유니크 인덱스로 동시 요청 레이스 컨디션 방어
        try {
            groupMemberRepository.save(
                GroupMember(
                    groupId = group.id,
                    userId = userId,
                    role = GroupRole.MEMBER
                )
            )
        } catch (e: DataIntegrityViolationException) {
            // 동시 요청으로 인한 중복 키 위반 시 정상 처리로 흡수
            return JoinGroupResponse(groupId = group.id, message = "이미 참여 중인 모임입니다.")
        }

        return JoinGroupResponse(groupId = group.id, message = "모임에 성공적으로 가입하였습니다.")
    }
}
