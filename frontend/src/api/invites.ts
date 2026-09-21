import { apiClient } from './client';
import type { InviteInfo } from '../types';
import { triggerGlobalToast } from '../context/ToastContext';

const PENDING_INVITE_KEY = 'dayuse_pending_invite_code';

export const inviteStorage = {
  get: (): string | null => {
    try {
      return sessionStorage.getItem(PENDING_INVITE_KEY) || localStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      return null;
    }
  },
  set: (code: string) => {
    try {
      const cleanCode = code.trim();
      sessionStorage.setItem(PENDING_INVITE_KEY, cleanCode);
      localStorage.setItem(PENDING_INVITE_KEY, cleanCode);
    } catch (e) {
      console.warn('Failed to save pending invite code to storage:', e);
    }
  },
  clear: () => {
    try {
      sessionStorage.removeItem(PENDING_INVITE_KEY);
      localStorage.removeItem(PENDING_INVITE_KEY);
    } catch (e) {
      console.warn('Failed to clear pending invite code from storage:', e);
    }
  },
};

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

export const handlePostLoginNavigation = async (
  navigate: (to: string, options?: { replace?: boolean }) => void
) => {
  const pendingCode = inviteStorage.get();
  if (!pendingCode) {
    navigate('/groups', { replace: true });
    return;
  }

  inviteStorage.clear();

  try {
    const res = await invitesApi.joinGroup(pendingCode);
    triggerGlobalToast({
      message: '모임에 성공적으로 참여했습니다!',
      type: 'success',
    });
    navigate(`/groups/${res.groupId}`, { replace: true });
  } catch (err: any) {
    console.warn('Auto join failed with pending invite code:', err);
    // 이미 가입된 모임(409 Conflict)인 경우 해당 모임 상세 페이지로 이동
    if (err.response?.status === 409) {
      try {
        const info = await invitesApi.getInviteInfo(pendingCode);
        triggerGlobalToast({
          message: '이미 참여 중인 모임입니다.',
          type: 'info',
        });
        navigate(`/groups/${info.groupId}`, { replace: true });
        return;
      } catch {
        navigate('/groups', { replace: true });
        return;
      }
    }

    // 그 외 유효하지 않은 코드 등의 경우 초대 안내 페이지로 이동
    navigate(`/invite/${pendingCode}`, { replace: true });
  }
};

