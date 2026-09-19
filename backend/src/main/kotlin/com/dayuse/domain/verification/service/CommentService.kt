package com.dayuse.domain.verification.service

import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.user.UserRepository
import com.dayuse.domain.verification.VerificationComment
import com.dayuse.domain.verification.VerificationCommentRepository
import com.dayuse.domain.verification.VerificationRepository
import com.dayuse.domain.verification.dto.CommentResponse
import com.dayuse.domain.verification.dto.CreateCommentRequest
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class CommentService(
    private val verificationRepository: VerificationRepository,
    private val verificationCommentRepository: VerificationCommentRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository
) {

    @Transactional(readOnly = true)
    fun getComments(verificationId: Long, userId: Long): List<CommentResponse> {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        val isMember = groupMemberRepository.existsByGroupIdAndUserId(verification.groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 댓글을 조회할 수 있습니다.")
        }

        val comments = verificationCommentRepository.findByVerificationIdOrderByCreatedAtAsc(verificationId)
        if (comments.isEmpty()) {
            return emptyList()
        }

        val userIds = comments.map { it.userId }.toSet()
        val userMap = userRepository.findAllById(userIds).associateBy { it.id }

        return comments.map { comment ->
            val author = userMap[comment.userId]
            CommentResponse(
                id = comment.id,
                verificationId = verificationId,
                userId = comment.userId,
                authorNickname = author?.nickname ?: "알 수 없음",
                authorProfileImageUrl = author?.profileImageUrl,
                content = comment.content,
                isMine = comment.userId == userId,
                createdAt = comment.createdAt
            )
        }
    }

    fun createComment(
        verificationId: Long,
        userId: Long,
        request: CreateCommentRequest
    ): CommentResponse {
        val verification = verificationRepository.findById(verificationId)
            .orElseThrow { ResourceNotFoundException("인증 내역을 찾을 수 없습니다.") }

        val isMember = groupMemberRepository.existsByGroupIdAndUserId(verification.groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 댓글을 작성할 수 있습니다.")
        }

        val comment = VerificationComment(
            verification = verification,
            userId = userId,
            content = request.content
        )
        verification.addComment(comment)
        val saved = verificationCommentRepository.save(comment)
        val author = userRepository.findById(userId).orElse(null)

        return CommentResponse(
            id = saved.id,
            verificationId = verificationId,
            userId = userId,
            authorNickname = author?.nickname ?: "알 수 없음",
            authorProfileImageUrl = author?.profileImageUrl,
            content = saved.content,
            isMine = true,
            createdAt = saved.createdAt
        )
    }

    fun deleteComment(commentId: Long, userId: Long) {
        val comment = verificationCommentRepository.findById(commentId)
            .orElseThrow { ResourceNotFoundException("댓글을 찾을 수 없습니다.") }

        if (comment.userId != userId) {
            throw ForbiddenException("본인이 작성한 댓글만 삭제할 수 있습니다.")
        }

        verificationCommentRepository.delete(comment)
    }
}
