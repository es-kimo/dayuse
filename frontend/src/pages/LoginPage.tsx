import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { handlePostLoginNavigation, inviteStorage } from '../api/invites';
import { MobileLayout } from '../components/MobileLayout';
import { DayuLogo } from '../components/brand/DayuLogo';
import { MessageCircle, UserCheck } from 'lucide-react';

import { Button, Select, FormField } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mockUserId, setMockUserId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    const redirectParam = searchParams.get('redirect');

    if (inviteParam) {
      inviteStorage.set(inviteParam);
    } else if (redirectParam && redirectParam.includes('/invite/')) {
      const match = redirectParam.match(/\/invite\/([^/?#]+)/);
      if (match && match[1]) {
        inviteStorage.set(match[1]);
      }
    }
  }, [searchParams]);

  const handleKakaoLogin = () => {
    const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID;
    const redirectUri = window.location.origin + '/oauth/callback/kakao';

    if (!clientId || clientId.startsWith('dummy-') || clientId.startsWith('test-')) {
      // 카카오 키가 설정되지 않은 로컬 환경인 경우 간편 모의 로그인 안내
      handleMockLogin(`mock-user-${mockUserId}`);
      return;
    }

    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code`;
    window.location.href = kakaoAuthUrl;
  };

  const handleMockLogin = async (code: string) => {
    setIsLoading(true);
    setLoginError('');
    try {
      const res = await authApi.loginWithKakao(code);
      login(res.accessToken, res.refreshToken, res.user);
      await handlePostLoginNavigation(navigate);
    } catch (err) {
      console.error('Mock login failed:', err);
      setLoginError('로그인에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="mb-6 flex flex-col items-center">
          <DayuLogo variant="app-icon" className="w-16 h-16 rounded-2xl shadow-sm mb-4" />
          <DayuLogo variant="horizontal" className="h-8 w-auto mb-2" />
        </div>

        <p className="text-body-sm text-ink-secondary font-medium text-center mb-1">
          목표는 각자, 꾸준함은 함께.
        </p>
        <p className="text-caption text-ink-muted text-center mb-10 max-w-xs">
          친구들과 각자의 챌린지를 인증하고 기록해요
        </p>

        {/* 카카오 로그인 버튼 (카카오 공식 디자인 가이드 준수) */}
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={isLoading}
          aria-busy={isLoading ? 'true' : undefined}
          className="w-full max-w-xs min-h-[48px] py-3.5 px-4 bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-semibold rounded-md flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition focus-ring disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <MessageCircle className="w-5 h-5 fill-current shrink-0" aria-hidden="true" />
          <span>{isLoading ? '로그인 처리 중...' : '카카오로 시작하기'}</span>
        </button>

        {loginError && (
          <div role="alert" aria-live="polite" className="mt-3 text-caption font-medium text-danger text-center max-w-xs">
            {loginError}
          </div>
        )}

        {/* 로컬 개발/학습용 모의 로그인 영역 (개발 환경에서만 노출) */}
        {import.meta.env.DEV && (
          <div className="w-full max-w-xs mt-10 pt-6 border-t border-line">
            <div className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3 text-center">
              로컬 개발·테스트용 빠른 로그인
            </div>
            <FormField label="테스트 계정 선택" id="mock-user-select" className="mb-2">
              <div className="flex items-center gap-2">
                <Select
                  id="mock-user-select"
                  value={mockUserId}
                  onChange={(e) => setMockUserId(e.target.value)}
                  className="flex-1"
                >
                  <option value="1">사용자 1 (모임장 테스트용)</option>
                  <option value="2">사용자 2 (초대 가입 테스트용)</option>
                  <option value="3">사용자 3 (비회원 차단 테스트용)</option>
                </Select>
                <Button
                  variant="dark"
                  size="md"
                  onClick={() => handleMockLogin(`mock-user-${mockUserId}`)}
                  isLoading={isLoading}
                  className="shrink-0"
                  leftIcon={<UserCheck className="w-4 h-4" />}
                >
                  접속
                </Button>
              </div>
            </FormField>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};
