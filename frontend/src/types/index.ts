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

export interface ChallengeSummary {
  id: number;
  groupId: number;
  title: string;
  description?: string | null;
  verificationCriteria: string;
  startDate: string;
  endDate: string;
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
  joinedAt: string;
  isCreator: boolean;
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

export interface CreateChallengePayload {
  title: string;
  description?: string;
  verificationCriteria: string;
  startDate: string;
  endDate?: string;
  myPenaltyAmount: number;
}

export interface UpdateChallengePayload {
  title?: string;
  description?: string;
  verificationCriteria?: string;
  startDate?: string;
  endDate?: string;
}

export interface JoinChallengePayload {
  penaltyAmount: number;
}

export interface UpdatePenaltyPayload {
  penaltyAmount: number;
}
