import { apiClient } from './client';
import type { TodayAction } from '../types';

export const todayApi = {
  getTodayActions: async (groupId: number): Promise<TodayAction[]> => {
    const res = await apiClient.get<TodayAction[]>(`/groups/${groupId}/today`);
    return res.data;
  },
  getAllTodayActions: async (): Promise<TodayAction[]> => {
    const res = await apiClient.get<TodayAction[]>('/today');
    return res.data;
  },
};
