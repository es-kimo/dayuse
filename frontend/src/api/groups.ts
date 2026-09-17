import { apiClient } from './client';
import type { GroupDetail, GroupSummary } from '../types';

export const groupsApi = {
  getMyGroups: async (): Promise<GroupSummary[]> => {
    const res = await apiClient.get<GroupSummary[]>('/groups');
    return res.data;
  },

  createGroup: async (name: string): Promise<GroupDetail> => {
    const res = await apiClient.post<GroupDetail>('/groups', { name });
    return res.data;
  },

  getGroupDetail: async (groupId: number): Promise<GroupDetail> => {
    const res = await apiClient.get<GroupDetail>(`/groups/${groupId}`);
    return res.data;
  },

  refreshInviteCode: async (groupId: number): Promise<{ inviteCode: string; inviteCodeIssuedAt: string }> => {
    const res = await apiClient.post<{ inviteCode: string; inviteCodeIssuedAt: string }>(
      `/groups/${groupId}/invite-code/refresh`
    );
    return res.data;
  },
};
