import { apiClient } from './client';
import type { InviteInfo } from '../types';

export const invitesApi = {
  getInviteInfo: async (inviteCode: string): Promise<InviteInfo> => {
    const res = await apiClient.get<InviteInfo>(`/invites/${inviteCode}`);
    return res.data;
  },

  joinGroup: async (inviteCode: string): Promise<{ groupId: number; message: string }> => {
    const res = await apiClient.post<{ groupId: number; message: string }>(`/invites/${inviteCode}/join`);
    return res.data;
  },
};
