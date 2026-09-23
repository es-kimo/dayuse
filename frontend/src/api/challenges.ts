import { apiClient } from './client';
import type {
  ChallengeDetail,
  ChallengeParticipant,
  ChallengeSummary,
  CreateChallengePayload,
  JoinChallengePayload,
  JoinPreviewResponse,
  UpdateChallengePayload,
  UpdatePenaltyPayload,
} from '../types';

export const challengesApi = {
  getGroupChallenges: async (groupId: number, status?: string): Promise<ChallengeSummary[]> => {
    const params = status && status !== 'ALL' ? { status } : undefined;
    const res = await apiClient.get<ChallengeSummary[]>(`/groups/${groupId}/challenges`, { params });
    return res.data;
  },

  createChallenge: async (groupId: number, payload: CreateChallengePayload): Promise<ChallengeDetail> => {
    const res = await apiClient.post<ChallengeDetail>(`/groups/${groupId}/challenges`, payload);
    return res.data;
  },

  getChallengeDetail: async (challengeId: number): Promise<ChallengeDetail> => {
    const res = await apiClient.get<ChallengeDetail>(`/challenges/${challengeId}`);
    return res.data;
  },

  updateChallenge: async (challengeId: number, payload: UpdateChallengePayload): Promise<ChallengeDetail> => {
    const res = await apiClient.patch<ChallengeDetail>(`/challenges/${challengeId}`, payload);
    return res.data;
  },

  deleteChallenge: async (challengeId: number): Promise<void> => {
    await apiClient.delete(`/challenges/${challengeId}`);
  },

  joinChallenge: async (challengeId: number, payload: JoinChallengePayload): Promise<ChallengeParticipant> => {
    const res = await apiClient.post<ChallengeParticipant>(`/challenges/${challengeId}/participants`, payload);
    return res.data;
  },

  getJoinPreview: async (challengeId: number): Promise<JoinPreviewResponse> => {
    const res = await apiClient.get<JoinPreviewResponse>(`/challenges/${challengeId}/preview-join`);
    return res.data;
  },

  leaveChallenge: async (challengeId: number): Promise<void> => {
    await apiClient.delete(`/challenges/${challengeId}/participants/me`);
  },

  updatePenalty: async (challengeId: number, payload: UpdatePenaltyPayload): Promise<ChallengeParticipant> => {
    const res = await apiClient.patch<ChallengeParticipant>(`/challenges/${challengeId}/participants/me`, payload);
    return res.data;
  },
};
