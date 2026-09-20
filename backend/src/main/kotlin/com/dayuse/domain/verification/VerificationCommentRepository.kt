package com.dayuse.domain.verification

import org.springframework.data.jpa.repository.JpaRepository

interface VerificationCommentRepository : JpaRepository<VerificationComment, Long> {
    fun findByVerificationIdOrderByCreatedAtAsc(verificationId: Long): List<VerificationComment>
}
