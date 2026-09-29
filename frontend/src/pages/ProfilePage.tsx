import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUiVersion } from '../context/UiVersionContext';
import { MobileLayout } from '../components/MobileLayout';
import { ProfileHeader } from '../components/ProfileHeader';
import { AppTabBar } from '../components/dayu/ui';
import {
  ArrowLeft,
  User as UserIcon,
  LogOut,
  Check,
  Loader2,
  Info,
  Bell,
  FileText,
  Shield,
  ChevronRight,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUserNickname, logout } = useAuth();
  const { uiVersion } = useUiVersion();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string>(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 2 || trimmed.length > 20) {
      setErrorMsg('닉네임은 2자 이상 20자 이하로 입력해 주세요.');
      return;
    }

    setIsUpdating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateUserNickname(trimmed);
      setSuccessMsg('닉네임이 성공적으로 변경되었습니다.');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      console.error('Failed to update nickname:', err);
      setErrorMsg('닉네임 수정 중 오류가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ==========================================
  // 신규 모바일 UI (B) 렌더링
  // ==========================================
  if (uiVersion === 'B') {
    return (
      <div className="max-w-app mx-auto min-h-dvh bg-[#F8FAFC] flex flex-col border-x border-slate-200 text-slate-800 font-sans relative">
        {/* 상단 바 */}
        <header className="sticky top-0 z-header h-14 bg-[#F8FAFC]/95 backdrop-blur-xs border-b border-transparent flex items-center px-4">
          <h1 className="text-[22px] font-extrabold tracking-tight text-slate-900">내 정보</h1>
        </header>

        <main className="flex-1 p-4 pb-8 flex flex-col gap-3.5">
          {/* 프로필 아바타 영역 (ProfileHeader) */}
          <ProfileHeader
            nickname={user?.nickname || '사용자'}
            dayuColor={(user as any)?.dayuColor || 'blue'}
            onAvatarClick={() => navigate('/profile/avatar')}
          />

          {/* 닉네임 수정 카드 */}
          <form onSubmit={handleUpdate} className="bg-white border border-slate-200 rounded-[18px] p-4 flex flex-col gap-2.5">
            <label htmlFor="nick" className="text-sm font-bold text-slate-800">
              닉네임
            </label>
            <div className="flex gap-2">
              <input
                id="nick"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setErrorMsg('');
                }}
                maxLength={20}
                className="flex-1 h-12 px-3.5 text-[15px] bg-white border border-slate-300 rounded-xl outline-hidden focus:border-blue-600 focus:ring-3 focus:ring-blue-100 transition"
              />
              <button
                type="submit"
                disabled={isUpdating || !nickname.trim() || nickname.trim() === user?.nickname}
                className="h-12 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[15px] font-bold rounded-xl transition active:scale-[0.98] flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
              </button>
            </div>
            <span className="text-[12.5px] text-slate-400">모임 피드와 공유 카드에 이 이름이 보여요</span>
            {errorMsg && <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-emerald-600 mt-0.5 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {successMsg}
              </p>
            )}
          </form>

          {/* 서비스 설정 및 안내 메뉴 */}
          <div className="bg-white border border-slate-200 rounded-[18px] overflow-hidden divide-y divide-slate-100 shadow-2xs">
            <button
              type="button"
              onClick={() => navigate('/settings/notifications')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[15px] font-semibold text-slate-800">미인증 알림</span>
                  <p className="text-[12.5px] text-slate-400">매일 21:00에 알려드려요</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/about')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-semibold text-slate-800">dayuse 소개</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/terms')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-semibold text-slate-800">이용약관</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            <button
              type="button"
              onClick={() => navigate('/privacy')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[11px] bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="text-[15px] font-semibold text-slate-800">개인정보처리방침</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            </button>
          </div>

          {/* 로그아웃 버튼 */}
          <button
            type="button"
            onClick={logout}
            className="w-full h-12 bg-white border border-slate-200 text-red-600 hover:bg-red-50/50 font-bold rounded-xl text-[15px] flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.99]"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>

          <p className="text-[12.5px] text-slate-400 text-center py-1">버전 0.1.0</p>
        </main>

        {/* 모바일 하단 탭 바 (AppTabBar) */}
        <AppTabBar
          active="me"
          onNavigate={(to) => {
            if (to === 'today') navigate('/today');
            else if (to === 'groups') navigate('/groups');
            else if (to === 'me') navigate('/profile');
          }}
        />
      </div>
    );
  }

  // ==========================================
  // 기존 레거시 UI (A) 온전한 보존
  // ==========================================
  return (
    <MobileLayout>
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/groups')}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-md"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-slate-800">프로필 설정</h1>
      </div>

      <div className="flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* 프로필 아바타 영역 */}
          <div className="flex flex-col items-center py-4">
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt={user.nickname}
                className="w-20 h-20 rounded-full object-cover border-2 border-slate-200 mb-3"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
                <UserIcon className="w-10 h-10" />
              </div>
            )}
            <span className="text-xs text-slate-400">카카오 계정 연동됨</span>
          </div>

          {/* 닉네임 수정 폼 */}
          <form onSubmit={handleUpdate} className="bg-white border border-slate-200 rounded-lg p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              닉네임 설정
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setErrorMsg('');
                }}
                maxLength={20}
                className="flex-1 px-3 py-2 text-base bg-slate-50 border border-slate-200 rounded-md outline-hidden focus:border-blue-500 focus:bg-white transition"
              />
              <button
                type="submit"
                disabled={isUpdating || nickname.trim() === user?.nickname}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-medium rounded-md transition active:scale-[0.98] flex items-center gap-1"
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '저장'}
              </button>
            </div>

            {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
            {successMsg && (
              <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                {successMsg}
              </p>
            )}
          </form>

          {/* 알림 설정 메뉴 */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            <button
              onClick={() => navigate('/settings/notifications')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-800">미인증 웹 푸시 알림</span>
                  <p className="text-[11px] text-slate-400">매일 저녁 리마인더 시간 및 수신 설정</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate('/about')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-800">dayuse 소개</span>
                  <p className="text-[11px] text-slate-400">서비스 소개 및 사용 가이드 보기</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={logout}
          className="w-full py-3 border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-red-600 font-medium rounded-md text-xs flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>로그아웃</span>
        </button>
      </div>
    </MobileLayout>
  );
};
