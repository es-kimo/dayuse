export type GroupRole = "HOST" | "MEMBER";

export interface User {
  id: number;
  kakaoId: string;
  nickname: string;
  profileImageUrl?: string | null;
}

export interface GroupSummary {
  id: number;
  name: string;
  hostUserId: number;
  role: GroupRole;
  memberCount: number;
  inviteCode?: string;
}

export interface GroupMember {
  id: number;
  userId: number;
  nickname: string;
  profileImageUrl?: string | null;
  role: GroupRole;
  joinedAt: string;
  /** 이 모임에서 진행 중인 챌린지 중 참여 중인 개수 */
  participatingChallengeCount?: number;
}

export interface GroupDetail {
  id: number;
  name: string;
  hostUserId: number;
  inviteCode: string;
  inviteCodeIssuedAt: string;
  isHost: boolean;
  memberCount: number;
  members: GroupMember[];
}

export interface InviteInfo {
  members?: { nickname: string; profileImageUrl?: string | null }[];
  challenges?: {
    id: number;
    title: string;
    periodType: PeriodType;
    targetFrequency?: number | null;
    participantCount: number;
  }[];
  groupId: number;
  groupName: string;
  hostNickname: string;
  memberCount: number;
  inviteCode: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export type ChallengeStatus = "NOT_STARTED" | "IN_PROGRESS" | "ENDED" | "ABORTED";
export type PeriodType = "DAILY" | "WEEKLY_N";
export type ExecutionType = "INDIVIDUAL" | "TOGETHER";
export type PeriodSettlementStatus =
  | "IN_PROGRESS"
  | "ACHIEVED"
  | "NEEDS_CONFIRMATION"
  | "CONFIRMED_FAILED"
  | "NOT_ACHIEVED"
  | "EXCLUDED_ABORTED";

export interface ChallengePeriodInterval {
  index: number;
  startDate: string;
  endDate: string;
  targetCount: number;
  completedCount: number;
  isAchieved: boolean;
  settlementStatus?: PeriodSettlementStatus | null;
  missedCount?: number | null;
  penaltyAmountPerMiss?: number | null;
  totalPenaltyAmount?: number | null;
  isSettled?: boolean;
}

export interface ChallengeParticipantPreview {
  userId: number;
  nickname: string;
  profileImageUrl?: string | null;
}

export type ChallengeSummary = {
  id: number;
  groupId: number;
  title: string;
  description?: string | null;
  verificationCriteria: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  periodType?: PeriodType;
  targetFrequency?: number | null;
  executionType?: ExecutionType;
  redayAllowed?: boolean;
  participantCount: number;
  participants?: ChallengeParticipantPreview[];
  isParticipating: boolean;
  isCreator: boolean;
  myPenaltyAmount?: number | null;
  canAbort?: boolean;
  createdAt: string;
} & (
  | {
      status: Exclude<ChallengeStatus, "ABORTED">;
      abortedAt?: null;
    }
  | {
      status: "ABORTED";
      abortedAt: string;
    }
);

export interface ChallengeParticipant {
  id: number;
  userId: number;
  nickname: string;
  profileImageUrl?: string | null;
  penaltyAmount: number;
  startDate: string;
  status: ParticipantStatus;
  completionRate: number;
  joinedAt: string;
  isCreator: boolean;
}

export type StartDateType = "TODAY" | "TOMORROW";
export type ParticipantStatus = "ACTIVE" | "CANCELLED";

export interface JoinOption {
  type: StartDateType;
  startDate: string;
  remainingDays: number;
  isRecommended: boolean;
}

export interface JoinPreviewResponse {
  challengeId: number;
  challengeTitle: string;
  challengeStartDate: string;
  challengeEndDate: string;
  isStarted: boolean;
  options: JoinOption[];
  defaultPenaltyAmount: number;
  executionType?: ExecutionType;
  periodType?: PeriodType;
  redayAllowed?: boolean;
  redayRuleDescription?: string | null;
}

export type ChallengeDetail = {
  id: number;
  groupId: number;
  groupName: string;
  creatorUserId: number;
  creatorNickname: string;
  title: string;
  description?: string | null;
  verificationCriteria: string;
  startDate: string;
  endDate: string;
  durationDays?: number;
  periodType?: PeriodType;
  targetFrequency?: number | null;
  executionType?: ExecutionType;
  redayAllowed?: boolean;
  redayRuleDescription?: string | null;
  totalTargetCount?: number;
  totalCompletedCount?: number;
  progressRate?: number;
  currentPeriod?: ChallengePeriodInterval | null;
  intervals?: ChallengePeriodInterval[] | null;
  isCreator: boolean;
  isParticipating: boolean;
  myPenaltyAmount?: number | null;
  canJoin: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canModifyFull: boolean;
  canAbort?: boolean;
  abortReason?: string | null;
  participants: ChallengeParticipant[];
  abortedByNickname?: string | null;
} & (
  | {
      status: Exclude<ChallengeStatus, "ABORTED">;
      abortedAt?: null;
      abortedBy?: null;
    }
  | {
      status: "ABORTED";
      abortedAt: string;
      abortedBy: number;
    }
);

export interface AbortChallengePayload {
  reason?: string;
}

export interface CreateParticipantPayload {
  userId: number;
  penaltyAmount: number;
}

export interface CreateChallengePayload {
  title: string;
  description?: string;
  verificationCriteria: string;
  startDate: string;
  endDate?: string;
  periodType?: PeriodType;
  targetFrequency?: number | null;
  executionType?: ExecutionType;
  redayAllowed?: boolean;
  myPenaltyAmount: number;
  participants?: CreateParticipantPayload[];
}

export interface ChallengeRestartTemplate {
  challengeId: number;
  title: string;
  description?: string | null;
  verificationCriteria: string;
  durationDays: number;
  periodType?: PeriodType;
  targetFrequency?: number | null;
  executionType?: ExecutionType;
  redayAllowed?: boolean;
  suggestedStartDate: string;
  suggestedEndDate: string;
  suggestedPenaltyAmount: number;
}

export interface UpdateChallengePayload {
  title?: string;
  description?: string;
  verificationCriteria?: string;
  startDate?: string;
  endDate?: string;
  periodType?: PeriodType;
  targetFrequency?: number | null;
  executionType?: ExecutionType;
  redayAllowed?: boolean;
}

export interface JoinChallengePayload {
  penaltyAmount: number;
  startDateType?: StartDateType;
}

export interface UpdatePenaltyPayload {
  penaltyAmount: number;
}

export interface TodayVerificationSummary {
  id: number;
  imageUrl: string;
  comment?: string | null;
  isLate: boolean;
  createdAt: string;
}

export interface TodayPeriodInfo {
  index: number;
  startDate: string;
  endDate: string;
  targetCount: number;
  completedCount: number;
  todayVerified: boolean;
  isGoalAchieved: boolean;
}

export interface TodayAction {
  streakDays?: number;
  challengeId: number;
  challengeTitle: string;
  verificationCriteria: string;
  startDate: string;
  endDate: string;
  executionType?: ExecutionType;
  isCompletedToday: boolean;
  canVerify: boolean;
  myVerification?: TodayVerificationSummary | null;
  groupId?: number;
  groupName?: string;
  periodType?: PeriodType;
  periodInfo?: TodayPeriodInfo | null;
  todayVerifierNickname?: string | null;
  isJointlyCompleted?: boolean;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  imageKey: string;
  expiresAt: string;
}

export type PenaltyStatus = "NONE" | "PENDING" | "CONFIRMED" | "EXEMPTED";

export type RedayIneligibleReason =
  | "ELIGIBLE"
  | "NOT_OWNER"
  | "NOT_ALLOWED"
  | "WEEKLY_NOT_SUPPORTED"
  | "TOGETHER_NOT_SUPPORTED"
  | "NO_PENALTY"
  | "CHALLENGE_ABORTED"
  | "NOT_VERIFIED"
  | "NOT_OVERDUE"
  | "ALREADY_APPLIED"
  | "ALREADY_SETTLED"
  | "ALREADY_CONFIRMED"
  | "EXPIRED";

export type VerificationTimePhase = "NORMAL" | "LATE" | "OVERDUE_REDAY_ELIGIBLE" | "OVERDUE_EXPIRED";

/** GET /daily-records/{id}/reday-eligibility 응답. 필드 이름은 백엔드 RedayEligibilityResponse와 1:1이다. */
export interface RedayEligibilityResponse {
  recordId: number;
  verificationId?: number | null;
  challengeId: number;
  targetDate: string;
  eligible: boolean;
  reason: RedayIneligibleReason;
  reasonMessage: string;
  redayAllowed: boolean;
  timePhase: VerificationTimePhase;
  penaltyAmount: number;
  penaltyStatus: PenaltyStatus;
  redayApplied: boolean;
  redayDeadline: string;
  /** 서버가 계산한 기한까지 남은 초. 화면 타이머는 이 값을 기준으로 내려간다. */
  remainingSeconds: number;
}

// ── v0.11 F05~F10: 리데이 티켓 및 보상형 광고 ──────────────────────

export type RedayTicketStatus = "AVAILABLE" | "USED";
export type RedayTicketSource = "REWARD_AD" | "ADMIN_GRANT" | "WELCOME_BONUS";

export interface RedayTicketBalance {
  userId: number;
  availableCount: number;
  totalCount: number;
}

export interface ApplyRedayPayload {
  dailyRecordId: number;
  ticketId?: number;
}

export interface ApplyRedayResponse {
  ticketId: number;
  dailyRecordId: number;
  penaltyExempted: boolean;
  previousPenaltyAmount: number;
  resultPenaltyAmount: number;
  appliedAt: string;
}

/** GET /groups/{groupId}/reday-candidates 응답 한 건. 본인 기록만 내려온다. */
export interface RedayCandidate {
  recordId: number;
  challengeId: number;
  challengeTitle: string;
  targetDate: string;
  penaltyAmount: number;
  penaltyStatus: PenaltyStatus;
  redayDeadline: string;
  remainingSeconds: number;
}

export type AdSessionStatus = "ISSUED" | "IMPRESSED" | "COMPLETED" | "ABANDONED" | "EXPIRED";
export type AdUnavailableReason = "NO_AVAILABLE_AD" | "DAILY_LIMIT_REACHED";

export interface AdCreative {
  id: number;
  campaignId: number;
  title: string;
  description: string;
  imageUrl?: string | null;
  ctaText?: string | null;
  /** 자체 광고 고정 표기 문구. 서버가 정하며 화면은 그대로 보여준다. */
  badgeText: string;
  minWatchSeconds: number;
  active: boolean;
}

export interface AdSessionDetail {
  sessionId: number;
  sessionToken: string;
  userId: number;
  dailyRecordId: number;
  campaignId: number;
  creativeId: number;
  status: AdSessionStatus;
  requiredWatchSeconds: number;
  issuedAt: string;
  expiresAt: string;
  creative: AdCreative;
}

export interface AdSessionIssueResponse {
  available: boolean;
  unavailableReason?: AdUnavailableReason | null;
  message?: string | null;
  session?: AdSessionDetail | null;
}

export interface AdImpressionResponse {
  sessionId: number;
  sessionToken: string;
  status: AdSessionStatus;
  impressionAt: string;
  firstImpression: boolean;
  expiresAt: string;
  requiredWatchSeconds: number;
}

export interface AdAbandonResponse {
  sessionId: number;
  sessionToken: string;
  status: AdSessionStatus;
  firstAbandon: boolean;
  abandonedAt: string;
}

export interface CompleteAdSessionResponse {
  sessionId: number;
  sessionToken: string;
  status: AdSessionStatus;
  /** 이번 요청에서 최초로 지급되었는지. 재시도(멱등 응답)에서는 false다. */
  newlyGranted: boolean;
  rewardHistoryId: number;
  grantedTicketId: number;
  availableTicketCount: number;
  completedAt: string;
  dailyRecordId: number;
  targetRecordRedayEligible: boolean;
  targetRecordDeadlineExpired: boolean;
  message: string;
}

export interface VerificationDetail {
  id: number;
  groupId: number;
  challengeId: number;
  userId: number;
  targetDate: string;
  imageUrl: string;
  comment?: string | null;
  isLate: boolean;
  createdAt: string;
  updatedAt: string;
  dailyRecordId?: number | null;
  redayAllowed?: boolean;
  redayEligible?: boolean;
  redayDeadline?: string | null;
  penaltyStatus?: PenaltyStatus;
  penaltyAmount?: number;
}

export interface FeedItem {
  id: number;
  groupId: number;
  challengeId: number;
  challengeTitle: string;
  userId: number;
  authorNickname: string;
  authorProfileImageUrl?: string | null;
  targetDate: string;
  imageUrl: string;
  comment?: string | null;
  isLate: boolean;
  commentCount: number;
  isMine: boolean;
  createdAt: string;
}

export interface FeedPageResponse {
  items: FeedItem[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface CommentItem {
  id: number;
  verificationId: number;
  userId: number;
  authorNickname: string;
  authorProfileImageUrl?: string | null;
  content: string;
  isMine: boolean;
  createdAt: string;
}

export type DailyRecordStatus = "NOT_PARTICIPATED" | "PLANNED" | "WAITING" | "COMPLETED" | "UNCHECKED" | "FAILED";
export type DepositStatus = "UNPAID" | "WAITING_CONFIRMATION" | "CONFIRMED";

export interface StatusSummaryResponse {
  verifiedUserIds?: number[];
  groupId: number;
  uncheckedCount: number;
  unpaidPenaltyAmount: number;
  pendingPenaltyAmount?: number;
}

export interface UncheckedRecordItem {
  id: number;
  challengeId: number;
  challengeTitle: string;
  date: string;
  status: DailyRecordStatus;
  penaltyAmount: number;
  verificationCriteria: string;
  redayAllowed?: boolean;
  penaltyStatus?: PenaltyStatus;
  redayDeadline?: string | null;
}

export interface LateVerificationPayload {
  imageUrl: string;
  comment?: string;
}

export interface DailyRecordDetail {
  id: number;
  groupId: number;
  challengeId: number;
  challengeParticipantId: number;
  userId: number;
  date: string;
  status: DailyRecordStatus;
  penaltyAmount: number;
  penaltyStatus?: PenaltyStatus;
  depositStatus: DepositStatus;
  verificationId?: number | null;
  isLate: boolean;
  failedAt?: string | null;
  redayApplied?: boolean;
  redayAppliedAt?: string | null;
  redayDeadline?: string | null;
}

export interface CalendarDailyRecordItem {
  id: number;
  date: string;
  status: DailyRecordStatus;
  penaltyAmount: number;
  depositStatus: DepositStatus;
  isLate: boolean;
  verificationId?: number | null;
  imageUrl?: string | null;
  comment?: string | null;
  penaltyStatus?: PenaltyStatus;
  redayApplied?: boolean;
  redayAppliedAt?: string | null;
  redayDeadline?: string | null;
}

export interface ParticipantCalendarItem {
  userId: number;
  nickname: string;
  profileImageUrl?: string | null;
  records: CalendarDailyRecordItem[];
}

export interface ChallengeCalendarResponse {
  challengeId: number;
  title: string;
  startDate: string;
  endDate: string;
  redayAllowed?: boolean;
  participants: ParticipantCalendarItem[];
}

export type DepositReportStatus = "WAITING_CONFIRMATION" | "CONFIRMED" | "REJECTED" | "CANCELLED";
export type DepositAuditAction =
  | "REPORTED"
  | "CANCELLED_BY_USER"
  | "CONFIRMED_BY_HOST"
  | "REJECTED_BY_HOST"
  | "CONFIRMATION_CANCELLED_BY_HOST";

export interface GroupAccount {
  id: number;
  groupId: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  updatedAt?: string | null;
}

export interface GroupAccountPayload {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface UnpaidRecordItem {
  id: number;
  challengeId: number;
  challengeTitle: string;
  date: string;
  penaltyAmount: number;
  status: DailyRecordStatus;
  periodSettlementId?: number | null;
  isPeriod?: boolean;
  periodIndex?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  targetCount?: number | null;
  completedCount?: number | null;
  missedCount?: number | null;
}

export interface CreateDepositReportPayload {
  depositorName: string;
  depositDate: string;
  totalAmount: number;
  dailyRecordIds?: number[];
  periodSettlementIds?: number[];
}

export interface RejectDepositReportPayload {
  reason: string;
}

export interface CancelConfirmationPayload {
  reason: string;
}

export interface DepositReportItemDetail {
  id: number;
  dailyRecordId?: number | null;
  periodSettlementId?: number | null;
  isPeriod?: boolean;
  periodIndex?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  date?: string | null;
  challengeId: number;
  challengeTitle: string;
  penaltyAmount: number;
}

export interface DepositAuditLogItem {
  id: number;
  action: DepositAuditAction;
  actorUserId: number;
  actorNickname?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface DepositReportDetail {
  id: number;
  groupId: number;
  userId: number;
  userNickname: string;
  userProfileImageUrl?: string | null;
  depositorName: string;
  depositDate: string;
  totalAmount: number;
  status: DepositReportStatus;
  rejectReason?: string | null;
  cancelReason?: string | null;
  processedByUserId?: number | null;
  processedByNickname?: string | null;
  processedAt?: string | null;
  createdAt: string;
  items: DepositReportItemDetail[];
  auditLogs: DepositAuditLogItem[];
}

export interface SettlementSummary {
  groupId: number;
  unpaidAmount: number;
  pendingAmount?: number;
  waitingAmount: number;
  confirmedAmount: number;
  myUnpaidAmount: number;
  myPendingAmount?: number;
  accountRegistered: boolean;
  account?: GroupAccount | null;
}

export type ShareCardType = "TODAY_VERIFICATION" | "STREAK";

export interface StreakHistoryItem {
  date: string;
  completed: boolean;
  inPeriod: boolean;
}

export interface ShareCardResponse {
  id: number;
  token: string;
  cardType: ShareCardType;
  challengeId: number;
  verificationId?: number | null;
  title: string;
  userNickname: string;
  imageUrl?: string | null;
  comment?: string | null;
  streakDays: number;
  historyJson?: string | null;
  executionType?: ExecutionType;
  actualVerifierNickname?: string | null;
  createdAt: string;
}

export interface PublicShareCardResponse {
  token: string;
  cardType: ShareCardType;
  challengeId: number;
  title: string;
  userNickname: string;
  imageUrl?: string | null;
  comment?: string | null;
  streakDays: number;
  historyJson?: string | null;
  executionType?: ExecutionType;
  actualVerifierNickname?: string | null;
  createdAt: string;
}
