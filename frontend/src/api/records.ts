import { apiClient } from './client';
import type {
  StatusSummaryResponse,
  UncheckedRecordItem,
  ChallengeCalendarResponse,
  DailyRecordDetail,
  LateVerificationPayload,
  VerificationDetail,
} from '../types';

export const recordsApi = {
  getStatusSummary: async (groupId: number): Promise<StatusSummaryResponse> => {
    const res = await apiClient.get<StatusSummaryResponse>(`/groups/${groupId}/status-summary`);
    return res.data;
  },

  getUncheckedRecords: async (groupId: number): Promise<UncheckedRecordItem[]> => {
    const res = await apiClient.get<UncheckedRecordItem[]>(`/groups/${groupId}/unchecked-records`);
    return res.data;
  },

  getChallengeCalendar: async (challengeId: number): Promise<ChallengeCalendarResponse> => {
    const res = await apiClient.get<ChallengeCalendarResponse>(`/challenges/${challengeId}/calendar`);
    return res.data;
  },

  markFailed: async (recordId: number): Promise<DailyRecordDetail> => {
    const res = await apiClient.post<DailyRecordDetail>(`/daily-records/${recordId}/mark-failed`);
    return res.data;
  },

  verifyLate: async (
    recordId: number,
    payload: LateVerificationPayload
  ): Promise<VerificationDetail> => {
    const res = await apiClient.post<VerificationDetail>(
      `/daily-records/${recordId}/verify-late`,
      payload
    );
    return res.data;
  },
};
