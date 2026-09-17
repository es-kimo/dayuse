import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { MobileLayout } from '../components/MobileLayout';
import { MessageCircle, Sparkles, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mockUserId, setMockUserId] = useState<string>('1');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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
    try {
      const res = await authApi.loginWithKakao(code);
      login(res.accessToken, res.refreshToken, res.user);
      navigate('/groups');
    } catch (err) {
      console.error('Mock login failed:', err);
      alert('로그인에 실패했습니다. 백엔드 서버 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg mb-6 shadow-blue-500/30">
          <Sparkles className="w-9 h-9" />
        </div>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">dayuse</h1>
        <p className="text-sm text-slate-500 text-center mb-10 max-w-xs">
          매일 함께하는 소모임 챌린지와 정산 서비스
        </p>

        {/* 카카오 로그인 버튼 */}
        <button
          onClick={handleKakaoLogin}
          disabled={isLoading}
          className="w-full max-w-xs py-3.5 px-4 bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] font-medium rounded-xl flex items-center justify-center gap-2.5 shadow-sm active:scale-95 transition"
        >
          <MessageCircle className="w-5 h-5 fill-current" />
          <span>카카오로 시작하기</span>
        </button>

        {/* 로컬 개발/학습용 모의 로그인 영역 */}
        <div className="w-full max-w-xs mt-10 pt-6 border-t border-slate-200">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
            로컬 개발·테스트용 빠른 로그인
          </div>
          <div className="flex items-center gap-2">
            <select
              value={mockUserId}
              onChange={(e) => setMockUserId(e.target.value)}
              className="flex-1 text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="1">사용자 1 (모임장 테스트용)</option>
              <option value="2">사용자 2 (초대 가입 테스트용)</option>
              <option value="3">사용자 3 (비회원 차단 테스트용)</option>
            </select>
            <button
              onClick={() => handleMockLogin(`mock-user-${mockUserId}`)}
              disabled={isLoading}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg flex items-center gap-1 active:scale-95 transition"
            >
              <UserCheck className="w-3.5 h-3.5" />
              접속
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};
