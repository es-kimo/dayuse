import { apiClient } from './client';
import type { AuthResponse, User } from '../types';

export const authApi = {
  loginWithKakao: async (code: string, redirectUri?: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/kakao', { code, redirectUri });
    return res.data;
  },

  refreshToken: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken });
    return res.data;
  },

  getMe: async (): Promise<User> => {
    const res = await apiClient.get<User>('/users/me');
    return res.data;
  },

  updateNickname: async (nickname: string): Promise<User> => {
    const res = await apiClient.patch<User>('/users/me', { nickname });
    return res.data;
  },
};
