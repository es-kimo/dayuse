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
     * [사용자 미션 3] 모임 중복 가입 방어 로직 구현 과제
     *
     * 🎓 핵심 질문:
     * - 애플리케이션 레벨의 existsByGroupIdAndUserId 검사만으로 충분할까요?
     *   동시에 2개의 가입 요청이 들어올 때 DB 레벨의 uk_group_user 복합 유니크 제약조건과 예외 처리가 왜 필요한가요?
     *
     * TODO: 아래 중복 가입 방어 로직을 직접 구현해 보세요!
     */
    @Transactional
    fun joinGroupByInviteCode(inviteCode: String, userId: Long): JoinGroupResponse {
        val group = groupRepository.findByInviteCode(inviteCode)
            ?: throw ResourceNotFoundException("유효하지 않거나 만료된 초대 코드입니다.")

        // TODO [사용자 미션 3]:
        // 1) 1차: 애플리케이션 레벨 중복 가입 검사 (existsByGroupIdAndUserId)
        // 2) 2차: 동시성 레이스 컨디션을 방어하는 DB 복합 유니크 제약조건 위반(DataIntegrityViolationException) 예외 처리
        TODO("[사용자 미션 3] 모임 중복 가입 방어 및 예외 처리 로직을 직접 구현해 보세요!")
    }
}
