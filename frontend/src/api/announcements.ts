import { apiClient } from './client';
import type {
  AnnouncementAdminResponse,
  AnnouncementPlacementNoticeResponse,
  AnnouncementPublishRequest,
  AnnouncementUnreadDotResponse,
  AnnouncementUpsertRequest,
  AnnouncementUserDetailResponse,
  AnnouncementUserItemResponse,
  AnnouncementUserStateResponse,
} from '../types';

/**
 * 일반 사용자용 새로운 소식 API
 */
export async function getUnreadDotStatus(): Promise<AnnouncementUnreadDotResponse> {
  const response = await apiClient.get<AnnouncementUnreadDotResponse>('/announcements/unread-dot');
  return response.data;
}

export async function getPlacementNotice(
  placement: string
): Promise<AnnouncementPlacementNoticeResponse> {
  const response = await apiClient.get<AnnouncementPlacementNoticeResponse>(
    `/announcements/placements/${encodeURIComponent(placement)}`
  );
  return response.data;
}

export async function listUserAnnouncements(): Promise<AnnouncementUserItemResponse[]> {
  const response = await apiClient.get<AnnouncementUserItemResponse[]>('/announcements');
  return response.data;
}

export async function getUserAnnouncementDetail(
  announcementId: number,
  markAsRead = true
): Promise<AnnouncementUserDetailResponse> {
  const response = await apiClient.get<AnnouncementUserDetailResponse>(
    `/announcements/${announcementId}`,
    {
      params: { markAsRead },
    }
  );
  return response.data;
}

export async function markAnnouncementAsRead(
  announcementId: number
): Promise<AnnouncementUserStateResponse> {
  const response = await apiClient.post<AnnouncementUserStateResponse>(
    `/announcements/${announcementId}/read`
  );
  return response.data;
}

export async function markAnnouncementAsDismissed(
  announcementId: number
): Promise<AnnouncementUserStateResponse> {
  const response = await apiClient.post<AnnouncementUserStateResponse>(
    `/announcements/${announcementId}/dismiss`
  );
  return response.data;
}

/**
 * 관리자 전용 새로운 소식 운영 API (F07)
 */
export async function listAdminAnnouncements(): Promise<AnnouncementAdminResponse[]> {
  const response = await apiClient.get<AnnouncementAdminResponse[]>('/admin/announcements');
  return response.data;
}

export async function getAdminAnnouncement(
  announcementId: number
): Promise<AnnouncementAdminResponse> {
  const response = await apiClient.get<AnnouncementAdminResponse>(
    `/admin/announcements/${announcementId}`
  );
  return response.data;
}

export async function createAdminAnnouncement(
  data: AnnouncementUpsertRequest
): Promise<AnnouncementAdminResponse> {
  const response = await apiClient.post<AnnouncementAdminResponse>('/admin/announcements', data);
  return response.data;
}

export async function updateAdminAnnouncement(
  announcementId: number,
  data: AnnouncementUpsertRequest
): Promise<AnnouncementAdminResponse> {
  const response = await apiClient.put<AnnouncementAdminResponse>(
    `/admin/announcements/${announcementId}`,
    data
  );
  return response.data;
}

export async function publishAdminAnnouncement(
  announcementId: number,
  data?: AnnouncementPublishRequest
): Promise<AnnouncementAdminResponse> {
  const response = await apiClient.post<AnnouncementAdminResponse>(
    `/admin/announcements/${announcementId}/publish`,
    data ?? {}
  );
  return response.data;
}

export async function endAdminAnnouncement(
  announcementId: number
): Promise<AnnouncementAdminResponse> {
  const response = await apiClient.post<AnnouncementAdminResponse>(
    `/admin/announcements/${announcementId}/end`
  );
  return response.data;
}
