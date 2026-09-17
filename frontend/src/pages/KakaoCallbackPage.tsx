import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { MobileLayout } from '../components/MobileLayout';
import { Loader2 } from 'lucide-react';

export const KakaoCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const processedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      alert('인가 코드가 전달되지 않았습니다.');
      navigate('/login');
      return;
    }

    if (processedRef.current) return;
    processedRef.current = true;

    const exchangeCode = async () => {
      try {
        const redirectUri = window.location.origin + '/oauth/callback/kakao';
        const res = await authApi.loginWithKakao(code, redirectUri);
        login(res.accessToken, res.refreshToken, res.user);
        navigate('/groups');
      } catch (err) {
        console.error('Failed to exchange kakao code:', err);
        alert('카카오 로그인 인증에 실패했습니다.');
        navigate('/login');
      }
    };

    exchangeCode();
  }, [searchParams, navigate, login]);

  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <h2 className="text-base font-semibold text-slate-800">카카오 로그인 처리 중...</h2>
        <p className="text-xs text-slate-500 mt-1">잠시만 기다려 주세요.</p>
      </div>
    </MobileLayout>
  );
};
