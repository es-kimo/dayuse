export type GroupRole = 'HOST' | 'MEMBER';

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

export type ChallengeStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'ENDED';
export type PeriodType = 'DAILY' | 'WEEKLY_N';

export interface ChallengePeriodInterval {
  index: number;
  startDate: string;
  endDate: string;
  targetCount: number;
  completedCount: number;
  isAchieved: boolean;
}

export interface ChallengeSummary {
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
  status: ChallengeStatus;
  participantCount: number;
  isParticipating: boolean;
  isCreator: boolean;
  myPenaltyAmount?: number | null;
  createdAt: string;
}

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

export type StartDateType = 'TODAY' | 'TOMORROW';
export type ParticipantStatus = 'ACTIVE' | 'CANCELLED';

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
}

export interface ChallengeDetail {
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
  totalTargetCount?: number;
  totalCompletedCount?: number;
  progressRate?: number;
  currentPeriod?: ChallengePeriodInterval | null;
  status: ChallengeStatus;
  isCreator: boolean;
  isParticipating: boolean;
  myPenaltyAmount?: number | null;
  canJoin: boolean;
  canCancel: boolean;
  canDelete: boolean;
  canModifyFull: boolean;
  participants: ChallengeParticipant[];
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

export interface TodayAction {
  challengeId: number;
  challengeTitle: string;
  verificationCriteria: string;
  startDate: string;
  endDate: string;
  isCompletedToday: boolean;
  canVerify: boolean;
  myVerification?: TodayVerificationSummary | null;
  groupId?: number;
  groupName?: string;
}

export interface PresignedUrlResponse {
  presignedUrl: string;
  imageKey: string;
  expiresAt: string;
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

export type DailyRecordStatus = 'NOT_PARTICIPATED' | 'PLANNED' | 'WAITING' | 'COMPLETED' | 'UNCHECKED' | 'FAILED';
export type DepositStatus = 'UNPAID' | 'WAITING_CONFIRMATION' | 'CONFIRMED';

export interface StatusSummaryResponse {
  groupId: number;
  uncheckedCount: number;
  unpaidPenaltyAmount: number;
}

export interface UncheckedRecordItem {
  id: number;
  challengeId: number;
  challengeTitle: string;
  date: string;
  status: DailyRecordStatus;
  penaltyAmount: number;
  verificationCriteria: string;
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
  depositStatus: DepositStatus;
  verificationId?: number | null;
  isLate: boolean;
  failedAt?: string | null;
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
  participants: ParticipantCalendarItem[];
}

export type DepositReportStatus = 'WAITING_CONFIRMATION' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
export type DepositAuditAction =
  | 'REPORTED'
  | 'CANCELLED_BY_USER'
  | 'CONFIRMED_BY_HOST'
  | 'REJECTED_BY_HOST'
  | 'CONFIRMATION_CANCELLED_BY_HOST';

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
}

export interface CreateDepositReportPayload {
  depositorName: string;
  depositDate: string;
  totalAmount: number;
  dailyRecordIds: number[];
}

export interface RejectDepositReportPayload {
  reason: string;
}

export interface CancelConfirmationPayload {
  reason: string;
}

export interface DepositReportItemDetail {
  id: number;
  dailyRecordId: number;
  date: string;
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
  waitingAmount: number;
  confirmedAmount: number;
  myUnpaidAmount: number;
  accountRegistered: boolean;
  account?: GroupAccount | null;
}

export type ShareCardType = 'TODAY_VERIFICATION' | 'STREAK';

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
  createdAt: string;
}



