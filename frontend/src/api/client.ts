import axios from 'axios';
import { triggerGlobalToast } from '../context/ToastContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * 외부 서비스(카카오 스크래퍼, OG 크롤러)에 넘길 절대 URL을 만든다.
 * 개발 환경의 상대 경로(/api/v1)로는 외부에서 접근할 수 없다.
 */
export const absoluteApiUrl = (path: string): string =>
  new URL(`${API_BASE_URL}${path}`, window.location.origin).toString();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data;
          localStorage.setItem('accessToken', accessToken);
          if (newRefreshToken) {
            localStorage.setItem('refreshToken', newRefreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    // 2. 네트워크 에러 및 타임아웃/연결 실패 처리 (토스트 및 재시도 제공)
    if (!error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      const isTimeout = error.code === 'ECONNABORTED';
      triggerGlobalToast({
        message: isTimeout
          ? '요청 시간이 초과되었습니다. 네트워크 연결 상태를 확인해 주세요.'
          : '서버와 연결이 불안정합니다. 네트워크를 확인해 주세요.',
        type: 'error',
        action: originalRequest
          ? {
              label: '다시 시도',
              onClick: () => {
                apiClient(originalRequest).catch(() => {});
              },
            }
          : undefined,
      });
    } else if (error.response.status >= 500) {
      // 3. 서버 500 내부 오류 공통 토스트 안내
      triggerGlobalToast({
        message:
          error.response.data?.message || '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        type: 'error',
      });
    }

    return Promise.reject(error);
  }
);
