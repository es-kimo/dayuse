import { Info, Plus, Kakao } from '../components/screens/ScreenIcons';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { handlePostLoginNavigation, inviteStorage } from '../api/invites';
import { Screen, screenAssets } from '../components/screens/Screen';

import { UserCheck } from 'lucide-react';
import { InAppBrowserNotice } from '../components/InAppBrowserNotice';

import { Button, Select, FormField } from '../components/ui';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [devOpen, setDevOpen] = useState(false);
  const [mockUserId, setMockUserId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');

  useEffect(() => {
    const inviteParam = searchParams.get('invite');
    const redirectParam = searchParams.get('redirect') || searchParams.get('returnTo');

    if (inviteParam) {
      inviteStorage.set(inviteParam);
    } else if (redirectParam && redirectParam.includes('/invite/')) {
      const match = redirectParam.match(/\/invite\/([^/?#]+)/);
      if (match && match[1]) {
        inviteStorage.set(match[1]);
      }
    } else if (redirectParam && redirectParam.startsWith('/') && !redirectParam.startsWith('//')) {
      sessionStorage.setItem('dayuse_return_to', redirectParam);
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
    <Screen>
      <main className="body" style={{ justifyContent: 'center', padding: '24px 28px' }}>
        <div className="center" style={{ gap: 18, marginTop: -10 }}>
          <img src={screenAssets.logo} alt="데이유즈" style={{ height: 44 }} />
          <div><p style={{ fontSize: 17, fontWeight: 700 }}>목표는 각자, 꾸준함은 함께.</p><p className="sub" style={{ marginTop: 4 }}>친구들과 각자의 챌린지를 인증하고 기록해요</p></div>
        </div>
        <InAppBrowserNotice />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 36 }}>
          <button className="btn kakao lg w100" onClick={handleKakaoLogin} disabled={isLoading}><Kakao className="ic" />{isLoading ? '로그인 처리 중...' : '카카오로 시작하기'}</button>
          <p className="help" style={{ textAlign: 'center' }}>시작하면 <a className="todo" href="/terms">이용약관</a>과 <a className="todo" href="/privacy">개인정보처리방침</a>에 동의하게 돼요.</p>
          {loginError && <p className="error" role="alert">{loginError}</p>}
        </div>
        {import.meta.env.DEV && <div className="dev" style={{ marginTop: 28 }}>
          <button type="button" aria-expanded={devOpen} onClick={() => setDevOpen(!devOpen)} className="lbl" style={{ display: 'flex', justifyContent: 'space-between', cursor: 'pointer', padding: 0, border: 0, background: 'none', width: '100%' }}><span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Info className="ic s" />개발용 빠른 로그인 · 로컬·테스트에서만 보여요</span><Plus className="ic s" /></button>
          {devOpen && <FormField label="테스트 계정 선택" id="mock-user-select" className="mt-3">
            <div className="flex gap-2">
              <Select id="mock-user-select" value={mockUserId} onChange={(e) => setMockUserId(e.target.value)}>
                <option value="1">사용자 1 (모임장 테스트용)</option><option value="2">사용자 2 (초대 가입 테스트용)</option><option value="3">사용자 3 (비회원 차단 테스트용)</option>
              </Select>
              <Button onClick={() => handleMockLogin(`mock-user-${mockUserId}`)} isLoading={isLoading} leftIcon={<UserCheck className="w-4 h-4" />}>접속</Button>
            </div>
          </FormField>}
        </div>}
      </main>
    </Screen>
  );
};
