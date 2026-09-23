import { apiClient } from './client';
import type { ShareCardResponse, PublicShareCardResponse } from '../types';

export const shareApi = {
  createVerificationShare: async (verificationId: number): Promise<ShareCardResponse> => {
    const res = await apiClient.post<ShareCardResponse>(`/shares/verifications/${verificationId}`);
    return res.data;
  },

  createStreakShare: async (challengeId: number): Promise<ShareCardResponse> => {
    const res = await apiClient.post<ShareCardResponse>(`/shares/challenges/${challengeId}/streak`);
    return res.data;
  },

  getPublicShareCard: async (token: string): Promise<PublicShareCardResponse> => {
    const res = await apiClient.get<PublicShareCardResponse>(`/public/shares/${token}`);
    return res.data;
  },

  deactivateShareCard: async (token: string): Promise<void> => {
    await apiClient.delete(`/shares/${token}`);
  },
};
