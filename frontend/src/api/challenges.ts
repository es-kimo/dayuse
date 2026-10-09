import { apiClient } from './client';
import { ContractError, parseChallengeDetail } from './challengeDetailContract';
import { reportContractViolation } from './contractViolationReporter';
import type {
  AbortChallengePayload,
  ChallengeDetail,
  ChallengeParticipant,
  ChallengeRestartTemplate,
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

  getRestartTemplate: async (groupId: number, challengeId: number): Promise<ChallengeRestartTemplate> => {
    const res = await apiClient.get<ChallengeRestartTemplate>(`/groups/${groupId}/challenges/${challengeId}/restart-template`);
    return res.data;
  },

  restartChallenge: async (groupId: number, challengeId: number, payload: CreateChallengePayload): Promise<ChallengeDetail> => {
    const res = await apiClient.post<ChallengeDetail>(`/groups/${groupId}/challenges/${challengeId}/restart`, payload);
    return res.data;
  },

  createChallenge: async (groupId: number, payload: CreateChallengePayload): Promise<ChallengeDetail> => {
    const res = await apiClient.post<ChallengeDetail>(`/groups/${groupId}/challenges`, payload);
    return res.data;
  },

  /**
   * 응답을 화면 모델로 바꿔 돌려준다. 계약 위반은 보고하되 표시 가능한 상세는 유지하고,
   * 표시할 수 없는 응답이면 ContractError를 던진다.
   */
  getChallengeDetail: async (challengeId: number): Promise<ChallengeDetail> => {
    const res = await apiClient.get<unknown>(`/challenges/${challengeId}`);
    const api = 'GET /challenges/{id}';
    try {
      const { detail, violations } = parseChallengeDetail(res.data);
      if (violations.length > 0) {
        reportContractViolation({ api, resourceId: challengeId, violations, fatal: false });
      }
      return detail;
    } catch (error) {
      if (error instanceof ContractError) {
        reportContractViolation({ api, resourceId: challengeId, violations: error.violations, fatal: true });
      }
      throw error;
    }
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

  confirmPeriod: async (groupId: number, challengeId: number, periodIndex: number): Promise<void> => {
    await apiClient.post(`/groups/${groupId}/challenges/${challengeId}/periods/${periodIndex}/confirm`);
  },

  abortChallenge: async (challengeId: number, payload?: AbortChallengePayload): Promise<ChallengeDetail> => {
    const res = await apiClient.post<ChallengeDetail>(`/challenges/${challengeId}/abort`, payload ?? {});
    return res.data;
  },
};
