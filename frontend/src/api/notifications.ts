import { apiClient } from './client';

export interface NotificationSettingResponse {
  enabled: boolean;
  reminderTime: string;
  hasActiveSubscription: boolean;
  vapidPublicKey: string;
}

export interface UpdateNotificationSettingRequest {
  enabled: boolean;
  reminderTime: string;
}

export interface RegisterPushSubscriptionRequest {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface UnregisterPushSubscriptionRequest {
  endpoint: string;
}

export interface TestPushResponse {
  success: boolean;
  message: string;
  sentDeviceCount: number;
}

export async function getNotificationSettings(): Promise<NotificationSettingResponse> {
  const response = await apiClient.get<NotificationSettingResponse>('/notifications/settings');
  return response.data;
}

export async function updateNotificationSettings(
  data: UpdateNotificationSettingRequest
): Promise<NotificationSettingResponse> {
  const response = await apiClient.put<NotificationSettingResponse>('/notifications/settings', data);
  return response.data;
}

export async function registerPushSubscription(
  data: RegisterPushSubscriptionRequest
): Promise<{ message: string }> {
  const response = await apiClient.post<{ message: string }>('/notifications/subscriptions', data);
  return response.data;
}

export async function unregisterPushSubscription(
  data: UnregisterPushSubscriptionRequest
): Promise<{ message: string }> {
  const response = await apiClient.delete<{ message: string }>('/notifications/subscriptions', { data });
  return response.data;
}

export async function sendTestPush(): Promise<TestPushResponse> {
  const response = await apiClient.post<TestPushResponse>('/notifications/test');
  return response.data;
}
