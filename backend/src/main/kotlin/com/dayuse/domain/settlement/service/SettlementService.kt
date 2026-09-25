package com.dayuse.domain.settlement.service

import com.dayuse.domain.challenge.ChallengeRepository
import com.dayuse.domain.challenge.period.ChallengePeriodSettlement
import com.dayuse.domain.challenge.period.ChallengePeriodSettlementRepository
import com.dayuse.domain.challenge.period.PeriodSettlementStatus
import com.dayuse.domain.dailyrecord.DailyRecord
import com.dayuse.domain.dailyrecord.DailyRecordRepository
import com.dayuse.domain.dailyrecord.DailyRecordStatus
import com.dayuse.domain.dailyrecord.DepositStatus
import com.dayuse.domain.group.GroupMemberRepository
import com.dayuse.domain.group.GroupRepository
import com.dayuse.domain.group.GroupRole
import com.dayuse.domain.settlement.DepositAuditAction
import com.dayuse.domain.settlement.DepositAuditLog
import com.dayuse.domain.settlement.DepositAuditLogRepository
import com.dayuse.domain.settlement.DepositReport
import com.dayuse.domain.settlement.DepositReportItem
import com.dayuse.domain.settlement.DepositReportItemRepository
import com.dayuse.domain.settlement.DepositReportRepository
import com.dayuse.domain.settlement.DepositReportStatus
import com.dayuse.domain.settlement.GroupAccount
import com.dayuse.domain.settlement.GroupAccountRepository
import com.dayuse.domain.settlement.dto.CancelConfirmationRequest
import com.dayuse.domain.settlement.dto.CreateDepositReportRequest
import com.dayuse.domain.settlement.dto.DepositAuditLogResponse
import com.dayuse.domain.settlement.dto.DepositReportDetailResponse
import com.dayuse.domain.settlement.dto.DepositReportItemResponse
import com.dayuse.domain.settlement.dto.GroupAccountRequest
import com.dayuse.domain.settlement.dto.GroupAccountResponse
import com.dayuse.domain.settlement.dto.RejectDepositReportRequest
import com.dayuse.domain.settlement.dto.SettlementSummaryResponse
import com.dayuse.domain.settlement.dto.UnpaidRecordItemResponse
import com.dayuse.domain.user.UserRepository
import com.dayuse.global.exception.BadRequestException
import com.dayuse.global.exception.ForbiddenException
import com.dayuse.global.exception.ResourceNotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class SettlementService(
    private val groupAccountRepository: GroupAccountRepository,
    private val depositReportRepository: DepositReportRepository,
    private val depositReportItemRepository: DepositReportItemRepository,
    private val depositAuditLogRepository: DepositAuditLogRepository,
    private val dailyRecordRepository: DailyRecordRepository,
    private val groupRepository: GroupRepository,
    private val groupMemberRepository: GroupMemberRepository,
    private val userRepository: UserRepository,
    private val challengeRepository: ChallengeRepository,
    private val challengePeriodSettlementRepository: ChallengePeriodSettlementRepository? = null
) {

    @Transactional(readOnly = true)
    fun getGroupAccount(
        groupId: Long,
        userId: Long
    ): GroupAccountResponse? {
        validateMember(groupId, userId)
        val account = groupAccountRepository.findByGroupId(groupId) ?: return null
        return toAccountResponse(account)
    }

    fun updateGroupAccount(
        groupId: Long,
        userId: Long,
        request: GroupAccountRequest
    ): GroupAccountResponse {
        validateHost(groupId, userId)
        if (!groupRepository.existsById(groupId)) {
            throw ResourceNotFoundException("모임을 찾을 수 없습니다. (ID: $groupId)")
        }

        val account = groupAccountRepository.findByGroupId(groupId)
            ?: GroupAccount(groupId = groupId)

        account.update(
            bankName = request.bankName.trim(),
            accountNumber = request.accountNumber.trim(),
            accountHolder = request.accountHolder.trim()
        )

        val saved = groupAccountRepository.save(account)
        return toAccountResponse(saved)
    }

    @Transactional(readOnly = true)
    fun getUnpaidRecords(
        groupId: Long,
        userId: Long
    ): List<UnpaidRecordItemResponse> {
        validateMember(groupId, userId)
        val dailyRecords = dailyRecordRepository.findUnpaidRecordsForDeposit(userId, groupId)

        // TODO [사용자 미션 2-A]: 주 N회 구간 미수행 확정 벌금 조회 및 UnpaidRecordItemResponse 매핑
        // challengePeriodSettlementRepository에서 userId, groupId에 해당하는 미납(UNPAID) 정산 건들을 조회하고,
        // UnpaidRecordItemResponse(isPeriod = true, periodIndex, periodStartDate, ...) 목록으로 변환하여
        // dailyItems와 합쳐서 반환하세요.
        val periodSettlements = emptyList<com.dayuse.domain.challenge.period.ChallengePeriodSettlement>()

        if (dailyRecords.isEmpty() && periodSettlements.isEmpty()) return emptyList()

        val allChallengeIds = (dailyRecords.map { it.challengeId } + periodSettlements.map { it.challengeId }).distinct()
        val challenges = challengeRepository.findAllById(allChallengeIds).associateBy { it.id }

        val dailyItems = dailyRecords.map { record ->
            UnpaidRecordItemResponse(
                id = record.id,
                challengeId = record.challengeId,
                challengeTitle = challenges[record.challengeId]?.title ?: "알 수 없는 챌린지",
                date = record.date,
                penaltyAmount = record.penaltyAmount,
                status = record.status,
                isPeriod = false
            )
        }

        return dailyItems
    }

    fun createDepositReport(
        groupId: Long,
        userId: Long,
        request: CreateDepositReportRequest
    ): DepositReportDetailResponse {
        validateMember(groupId, userId)

        if (!groupAccountRepository.existsByGroupId(groupId)) {
            throw BadRequestException("모임 계좌가 등록되지 않아 입금 신고를 진행할 수 없습니다. (ACCOUNT_NOT_REGISTERED)")
        }

        val distinctDailyIds = request.dailyRecordIds.distinct()
        val distinctPeriodIds = request.periodSettlementIds.distinct()
        if (distinctDailyIds.isEmpty() && distinctPeriodIds.isEmpty()) {
            throw BadRequestException("입금할 미수행 기록을 1개 이상 선택해 주세요.")
        }

        val records = if (distinctDailyIds.isNotEmpty()) dailyRecordRepository.findAllByIdInWithLock(distinctDailyIds) else emptyList()
        if (records.size != distinctDailyIds.size) {
            throw BadRequestException("존재하지 않거나 유효하지 않은 미수행 기록이 포함되어 있습니다.")
        }

        val periodSettlements = if (distinctPeriodIds.isNotEmpty()) {
            challengePeriodSettlementRepository?.findAllByIdInWithLock(distinctPeriodIds).orEmpty()
        } else emptyList()
        if (periodSettlements.size != distinctPeriodIds.size) {
            throw BadRequestException("존재하지 않거나 유효하지 않은 미수행 구간이 포함되어 있습니다.")
        }

        for (record in records) {
            if (record.userId != userId || record.groupId != groupId) {
                throw ForbiddenException("본인의 모임 미수행 기록만 신고할 수 있습니다.")
            }
            if (record.status != DailyRecordStatus.FAILED) {
                throw BadRequestException("미수행 확정된 기록만 입금 신고할 수 있습니다.")
            }
            if (record.depositStatus != DepositStatus.UNPAID) {
                throw BadRequestException("이미 입금 확인 대기 중이거나 완료된 기록이 포함되어 있습니다.")
            }
            if (record.penaltyAmount <= 0) {
                throw BadRequestException("약정 벌금이 0원인 기록은 입금 대상에서 원천 제외됩니다.")
            }
        }

        // TODO [사용자 미션 2-B]: 주 N회 구간 정산 건(periodSettlements)에 대한 입금 신고 검증 및 상태 전이
        // 1. periodSettlements의 소유자(userId, groupId), 상태(CONFIRMED_FAILED), depositStatus(UNPAID), 벌금액(> 0)을 검증하세요.
        // 2. calculatedTotal 합산에 periodSettlements의 totalPenaltyAmount를 포함하세요.
        // 3. 입금 신고 제출 시 periodSettlements의 depositStatus를 WAITING_CONFIRMATION으로 전이하세요.
        // 4. DepositReportItem 생성 시 periodSettlementId를 매핑하여 items에 포함하세요.
        val calculatedTotal = records.sumOf { it.penaltyAmount }
        if (calculatedTotal != request.totalAmount) {
            throw BadRequestException("선택한 미수행 기록 벌금 합계(${calculatedTotal}원)와 신고 금액(${request.totalAmount}원)이 일치하지 않습니다.")
        }

        // 1. 상태 전이: WAITING_CONFIRMATION
        records.forEach { it.depositStatus = DepositStatus.WAITING_CONFIRMATION }

        // 2. DepositReport 엔티티 생성
        val report = depositReportRepository.save(
            DepositReport(
                groupId = groupId,
                userId = userId,
                depositorName = request.depositorName.trim(),
                depositDate = request.depositDate,
                totalAmount = request.totalAmount,
                status = DepositReportStatus.WAITING_CONFIRMATION
            )
        )

        // 3. DepositReportItem 생성 및 저장
        val items = records.map {
            DepositReportItem(
                depositReportId = report.id,
                dailyRecordId = it.id
            )
        }
        val savedItems = depositReportItemRepository.saveAll(items)

        // 4. 감사 로그 생성 및 저장
        val auditLog = depositAuditLogRepository.save(
            DepositAuditLog(
                depositReportId = report.id,
                action = DepositAuditAction.REPORTED,
                actorUserId = userId
            )
        )

        val challengeIds = (records.map { it.challengeId } + periodSettlements.map { it.challengeId }).distinct()
        val challenges = challengeRepository.findAllById(challengeIds).associateBy { it.id }
        val user = userRepository.findById(userId).orElse(null)

        return toDetailResponse(
            report = report,
            items = savedItems,
            records = records,
            periodSettlements = periodSettlements,
            challenges = challenges,
            userMap = mapOf(userId to user),
            auditLogs = listOf(auditLog)
        )
    }

    fun cancelDepositReport(
        reportId: Long,
        userId: Long
    ): DepositReportDetailResponse {
        val report = depositReportRepository.findById(reportId)
            .orElseThrow { ResourceNotFoundException("입금 신고를 찾을 수 없습니다. (ID: $reportId)") }

        if (report.userId != userId) {
            throw ForbiddenException("본인이 제출한 입금 신고만 취소할 수 있습니다.")
        }

        if (report.status != DepositReportStatus.WAITING_CONFIRMATION) {
            throw BadRequestException("확인 대기(WAITING_CONFIRMATION) 상태의 입금 신고만 취소할 수 있습니다.")
        }

        // 1. 신고 취소
        report.cancelByUser()

        // 2. 연관된 DailyRecord 및 PeriodSettlement depositStatus를 UNPAID로 원복
        val items = depositReportItemRepository.findAllByDepositReportId(report.id)
        val dailyRecordIds = items.mapNotNull { it.dailyRecordId }
        val periodSettlementIds = items.mapNotNull { it.periodSettlementId }

        if (dailyRecordIds.isNotEmpty()) {
            val records = dailyRecordRepository.findAllById(dailyRecordIds)
            records.forEach { it.depositStatus = DepositStatus.UNPAID }
        }
        if (periodSettlementIds.isNotEmpty()) {
            val periodSettlements = challengePeriodSettlementRepository?.findAllById(periodSettlementIds).orEmpty()
            periodSettlements.forEach { it.depositStatus = DepositStatus.UNPAID }
        }

        // 3. 감사 로그 저장
        depositAuditLogRepository.save(
            DepositAuditLog(
                depositReportId = report.id,
                action = DepositAuditAction.CANCELLED_BY_USER,
                actorUserId = userId
            )
        )

        return getReportDetail(report.id, userId)
    }

    @Transactional(readOnly = true)
    fun getDepositReports(
        groupId: Long,
        userId: Long,
        status: DepositReportStatus?
    ): List<DepositReportDetailResponse> {
        validateMember(groupId, userId)

        val reports = if (status != null) {
            depositReportRepository.findAllByGroupIdAndStatusOrderByCreatedAtDesc(groupId, status)
        } else {
            depositReportRepository.findAllByGroupIdOrderByCreatedAtDesc(groupId)
        }

        if (reports.isEmpty()) return emptyList()

        val reportIds = reports.map { it.id }
        val allItems = depositReportItemRepository.findAllByDepositReportIdIn(reportIds)
        val itemsByReport = allItems.groupBy { it.depositReportId }

        val allRecordIds = allItems.mapNotNull { it.dailyRecordId }.distinct()
        val records = dailyRecordRepository.findAllById(allRecordIds).associateBy { it.id }

        val allPeriodIds = allItems.mapNotNull { it.periodSettlementId }.distinct()
        val periodSettlements = challengePeriodSettlementRepository?.findAllById(allPeriodIds).orEmpty().associateBy { it.id }

        val allChallengeIds = (records.values.map { it.challengeId } + periodSettlements.values.map { it.challengeId }).distinct()
        val challenges = challengeRepository.findAllById(allChallengeIds).associateBy { it.id }

        val userIds = (reports.map { it.userId } + reports.mapNotNull { it.processedByUserId }).distinct()
        val users = userRepository.findAllById(userIds).associateBy { it.id }

        return reports.map { report ->
            val items = itemsByReport[report.id].orEmpty()
            val itemResponses = items.mapNotNull { item ->
                if (item.periodSettlementId != null) {
                    val s = periodSettlements[item.periodSettlementId] ?: return@mapNotNull null
                    DepositReportItemResponse(
                        id = item.id,
                        dailyRecordId = null,
                        periodSettlementId = s.id,
                        date = s.endDate,
                        challengeId = s.challengeId,
                        challengeTitle = challenges[s.challengeId]?.title ?: "알 수 없는 챌린지",
                        penaltyAmount = s.totalPenaltyAmount,
                        isPeriod = true,
                        periodIndex = s.periodIndex,
                        periodStartDate = s.startDate,
                        periodEndDate = s.endDate,
                        targetCount = s.targetCount,
                        completedCount = s.completedCount,
                        missedCount = s.missedCount
                    )
                } else {
                    val record = records[item.dailyRecordId] ?: return@mapNotNull null
                    DepositReportItemResponse(
                        id = item.id,
                        dailyRecordId = record.id,
                        periodSettlementId = null,
                        date = record.date,
                        challengeId = record.challengeId,
                        challengeTitle = challenges[record.challengeId]?.title ?: "알 수 없는 챌린지",
                        penaltyAmount = record.penaltyAmount,
                        isPeriod = false
                    )
                }
            }

            val user = users[report.userId]
            val processedUser = report.processedByUserId?.let { users[it] }

            DepositReportDetailResponse(
                id = report.id,
                groupId = report.groupId,
                userId = report.userId,
                userNickname = user?.nickname ?: "탈퇴한 사용자",
                userProfileImageUrl = user?.profileImageUrl,
                depositorName = report.depositorName,
                depositDate = report.depositDate,
                totalAmount = report.totalAmount,
                status = report.status,
                rejectReason = report.rejectReason,
                cancelReason = report.cancelReason,
                processedByUserId = report.processedByUserId,
                processedByNickname = processedUser?.nickname,
                processedAt = report.processedAt,
                createdAt = report.createdAt,
                items = itemResponses,
                auditLogs = emptyList()
            )
        }
    }

    fun confirmDepositReport(
        reportId: Long,
        hostUserId: Long
    ): DepositReportDetailResponse {
        val report = depositReportRepository.findById(reportId)
            .orElseThrow { ResourceNotFoundException("입금 신고를 찾을 수 없습니다. (ID: $reportId)") }

        validateHost(report.groupId, hostUserId)

        if (report.status != DepositReportStatus.WAITING_CONFIRMATION) {
            throw BadRequestException("확인 대기(WAITING_CONFIRMATION) 상태의 입금 신고만 승인할 수 있습니다.")
        }

        // 1. 신고 승인 처리
        report.confirmByHost(hostUserId)

        // 2. 연관된 DailyRecord 및 PeriodSettlement depositStatus를 CONFIRMED로 변경
        val items = depositReportItemRepository.findAllByDepositReportId(report.id)
        val dailyRecordIds = items.mapNotNull { it.dailyRecordId }
        val periodSettlementIds = items.mapNotNull { it.periodSettlementId }

        if (dailyRecordIds.isNotEmpty()) {
            val records = dailyRecordRepository.findAllById(dailyRecordIds)
            records.forEach { it.depositStatus = DepositStatus.CONFIRMED }
        }
        if (periodSettlementIds.isNotEmpty()) {
            val periodSettlements = challengePeriodSettlementRepository?.findAllById(periodSettlementIds).orEmpty()
            periodSettlements.forEach { it.depositStatus = DepositStatus.CONFIRMED }
        }

        // 3. 감사 로그 저장
        depositAuditLogRepository.save(
            DepositAuditLog(
                depositReportId = report.id,
                action = DepositAuditAction.CONFIRMED_BY_HOST,
                actorUserId = hostUserId
            )
        )

        return getReportDetail(report.id, hostUserId)
    }

    fun rejectDepositReport(
        reportId: Long,
        hostUserId: Long,
        request: RejectDepositReportRequest
    ): DepositReportDetailResponse {
        val report = depositReportRepository.findById(reportId)
            .orElseThrow { ResourceNotFoundException("입금 신고를 찾을 수 없습니다. (ID: $reportId)") }

        validateHost(report.groupId, hostUserId)

        if (report.status != DepositReportStatus.WAITING_CONFIRMATION) {
            throw BadRequestException("확인 대기(WAITING_CONFIRMATION) 상태의 입금 신고만 반려할 수 있습니다.")
        }

        val reason = request.reason.trim()
        if (reason.isBlank()) {
            throw BadRequestException("반려 사유를 입력해 주세요.")
        }

        // 1. 신고 반려 처리
        report.rejectByHost(hostUserId, reason)

        // 2. 연관된 DailyRecord 및 PeriodSettlement depositStatus를 UNPAID로 원복
        val items = depositReportItemRepository.findAllByDepositReportId(report.id)
        val dailyRecordIds = items.mapNotNull { it.dailyRecordId }
        val periodSettlementIds = items.mapNotNull { it.periodSettlementId }

        if (dailyRecordIds.isNotEmpty()) {
            val records = dailyRecordRepository.findAllById(dailyRecordIds)
            records.forEach { it.depositStatus = DepositStatus.UNPAID }
        }
        if (periodSettlementIds.isNotEmpty()) {
            val periodSettlements = challengePeriodSettlementRepository?.findAllById(periodSettlementIds).orEmpty()
            periodSettlements.forEach { it.depositStatus = DepositStatus.UNPAID }
        }

        // 3. 감사 로그 저장
        depositAuditLogRepository.save(
            DepositAuditLog(
                depositReportId = report.id,
                action = DepositAuditAction.REJECTED_BY_HOST,
                actorUserId = hostUserId,
                reason = reason
            )
        )

        return getReportDetail(report.id, hostUserId)
    }

    fun cancelConfirmation(
        reportId: Long,
        hostUserId: Long,
        request: CancelConfirmationRequest
    ): DepositReportDetailResponse {
        val report = depositReportRepository.findByIdWithLock(reportId)
            ?: throw ResourceNotFoundException("입금 신고를 찾을 수 없습니다. (ID: $reportId)")

        validateHost(report.groupId, hostUserId)

        if (report.status != DepositReportStatus.CONFIRMED) {
            throw BadRequestException("확인 완료(CONFIRMED) 상태의 입금 건만 확인을 취소할 수 있습니다.")
        }

        val reason = request.reason.trim()
        if (reason.isBlank()) {
            throw BadRequestException("확인 취소 사유를 입력해 주세요.")
        }

        report.cancelConfirmationByHost(hostUserId, reason)

        val items = depositReportItemRepository.findAllByDepositReportId(report.id)
        val dailyRecordIds = items.mapNotNull { it.dailyRecordId }
        val periodSettlementIds = items.mapNotNull { it.periodSettlementId }

        if (dailyRecordIds.isNotEmpty()) {
            val records = dailyRecordRepository.findAllById(dailyRecordIds)
            records.forEach { it.depositStatus = DepositStatus.UNPAID }
        }
        if (periodSettlementIds.isNotEmpty()) {
            val periodSettlements = challengePeriodSettlementRepository?.findAllById(periodSettlementIds).orEmpty()
            periodSettlements.forEach { it.depositStatus = DepositStatus.UNPAID }
        }

        depositAuditLogRepository.save(
            DepositAuditLog(
                depositReportId = report.id,
                action = DepositAuditAction.CONFIRMATION_CANCELLED_BY_HOST,
                actorUserId = hostUserId,
                reason = reason
            )
        )

        return getReportDetail(report.id, hostUserId)
    }

    @Transactional(readOnly = true)
    fun getReportDetail(
        reportId: Long,
        userId: Long
    ): DepositReportDetailResponse {
        val report = depositReportRepository.findById(reportId)
            .orElseThrow { ResourceNotFoundException("입금 신고를 찾을 수 없습니다. (ID: $reportId)") }

        validateMember(report.groupId, userId)

        val items = depositReportItemRepository.findAllByDepositReportId(report.id)
        val dailyRecordIds = items.mapNotNull { it.dailyRecordId }
        val periodSettlementIds = items.mapNotNull { it.periodSettlementId }

        val records = if (dailyRecordIds.isNotEmpty()) dailyRecordRepository.findAllById(dailyRecordIds) else emptyList()
        val periodSettlements = if (periodSettlementIds.isNotEmpty()) {
            challengePeriodSettlementRepository?.findAllById(periodSettlementIds).orEmpty()
        } else emptyList()

        val challengeIds = (records.map { it.challengeId } + periodSettlements.map { it.challengeId }).distinct()
        val challenges = challengeRepository.findAllById(challengeIds).associateBy { it.id }

        val auditLogs = depositAuditLogRepository.findAllByDepositReportIdOrderByCreatedAtAsc(report.id)
        val userIds = (listOf(report.userId) + listOfNotNull(report.processedByUserId) + auditLogs.map { it.actorUserId }).distinct()
        val userMap = userRepository.findAllById(userIds).associateBy { it.id }

        return toDetailResponse(
            report = report,
            items = items,
            records = records,
            periodSettlements = periodSettlements,
            challenges = challenges,
            userMap = userMap,
            auditLogs = auditLogs
        )
    }

    @Transactional(readOnly = true)
    fun getSettlementSummary(
        groupId: Long,
        userId: Long
    ): SettlementSummaryResponse {
        validateMember(groupId, userId)

        val unpaidAmount = dailyRecordRepository.calculateGroupUnpaidPenaltyAmount(groupId) +
                (challengePeriodSettlementRepository?.calculateGroupUnpaidPenaltyAmount(groupId) ?: 0)
        val waitingAmount = depositReportRepository.calculateWaitingAmount(groupId)
        val confirmedAmount = depositReportRepository.calculateConfirmedAmount(groupId)
        val myUnpaidAmount = dailyRecordRepository.calculateUnpaidPenaltyAmount(userId, groupId) +
                (challengePeriodSettlementRepository?.calculateUnpaidPenaltyAmount(userId, groupId) ?: 0)

        val account = groupAccountRepository.findByGroupId(groupId)

        return SettlementSummaryResponse(
            groupId = groupId,
            unpaidAmount = unpaidAmount,
            waitingAmount = waitingAmount,
            confirmedAmount = confirmedAmount,
            myUnpaidAmount = myUnpaidAmount,
            accountRegistered = account != null,
            account = account?.let { toAccountResponse(it) }
        )
    }

    private fun validateMember(groupId: Long, userId: Long) {
        val isMember = groupMemberRepository.existsByGroupIdAndUserId(groupId, userId)
        if (!isMember) {
            throw ForbiddenException("해당 모임의 멤버만 정산 정보를 조회하거나 처리할 수 있습니다.")
        }
    }

    private fun validateHost(groupId: Long, userId: Long) {
        val membership = groupMemberRepository.findByGroupIdAndUserId(groupId, userId)
            ?: throw ForbiddenException("해당 모임의 멤버가 아닙니다.")
        if (membership.role != GroupRole.HOST) {
            throw ForbiddenException("모임장(HOST)만 정산 관리 작업을 수행할 수 있습니다.")
        }
    }

    private fun toAccountResponse(account: GroupAccount): GroupAccountResponse {
        return GroupAccountResponse(
            id = account.id,
            groupId = account.groupId,
            bankName = account.bankName,
            accountNumber = account.accountNumber,
            accountHolder = account.accountHolder,
            updatedAt = account.updatedAt
        )
    }

    private fun toDetailResponse(
        report: DepositReport,
        items: List<DepositReportItem>,
        records: List<DailyRecord>,
        periodSettlements: List<ChallengePeriodSettlement> = emptyList(),
        challenges: Map<Long, com.dayuse.domain.challenge.Challenge>,
        userMap: Map<Long, com.dayuse.domain.user.User?>,
        auditLogs: List<DepositAuditLog>
    ): DepositReportDetailResponse {
        val recordMap = records.associateBy { it.id }
        val periodMap = periodSettlements.associateBy { it.id }

        val itemResponses = items.mapNotNull { item ->
            if (item.periodSettlementId != null) {
                val s = periodMap[item.periodSettlementId] ?: return@mapNotNull null
                DepositReportItemResponse(
                    id = item.id,
                    dailyRecordId = null,
                    periodSettlementId = s.id,
                    date = s.endDate,
                    challengeId = s.challengeId,
                    challengeTitle = challenges[s.challengeId]?.title ?: "알 수 없는 챌린지",
                    penaltyAmount = s.totalPenaltyAmount,
                    isPeriod = true,
                    periodIndex = s.periodIndex,
                    periodStartDate = s.startDate,
                    periodEndDate = s.endDate,
                    targetCount = s.targetCount,
                    completedCount = s.completedCount,
                    missedCount = s.missedCount
                )
            } else {
                val record = recordMap[item.dailyRecordId] ?: return@mapNotNull null
                DepositReportItemResponse(
                    id = item.id,
                    dailyRecordId = record.id,
                    periodSettlementId = null,
                    date = record.date,
                    challengeId = record.challengeId,
                    challengeTitle = challenges[record.challengeId]?.title ?: "알 수 없는 챌린지",
                    penaltyAmount = record.penaltyAmount,
                    isPeriod = false
                )
            }
        }

        val auditLogResponses = auditLogs.map { log ->
            DepositAuditLogResponse(
                id = log.id,
                action = log.action,
                actorUserId = log.actorUserId,
                actorNickname = userMap[log.actorUserId]?.nickname,
                reason = log.reason,
                createdAt = log.createdAt
            )
        }

        val user = userMap[report.userId]
        val processedUser = report.processedByUserId?.let { userMap[it] }

        return DepositReportDetailResponse(
            id = report.id,
            groupId = report.groupId,
            userId = report.userId,
            userNickname = user?.nickname ?: "탈퇴한 사용자",
            userProfileImageUrl = user?.profileImageUrl,
            depositorName = report.depositorName,
            depositDate = report.depositDate,
            totalAmount = report.totalAmount,
            status = report.status,
            rejectReason = report.rejectReason,
            cancelReason = report.cancelReason,
            processedByUserId = report.processedByUserId,
            processedByNickname = processedUser?.nickname,
            processedAt = report.processedAt,
            createdAt = report.createdAt,
            items = itemResponses,
            auditLogs = auditLogResponses
        )
    }
}
