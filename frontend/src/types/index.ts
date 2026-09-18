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
