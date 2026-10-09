import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader } from '../components/ProfileHeader';
import { parseUserDayuColor } from '../components/dayu/dayuColors';
import { Button } from '../components/dayu/ui';
import { ScreenNav } from '../components/screens/Screen';
import { AppMainHeader } from '../components/layout/AppMainHeader';
import { IosInstallGuideModal } from '../components/IosInstallGuideModal';
import { isStandalone, isIos } from '../utils/webPush';
import { logPwaImpression, logPwaGuideOpen } from '../utils/pwaAnalytics';
import { useAnnouncementNotification } from '../context/AnnouncementNotificationContext';
import { LogOut, Check, Loader2, Info, Bell, FileText, Shield, ChevronRight, Smartphone, Megaphone } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateUserNickname, logout } = useAuth();
  const { hasUnread } = useAnnouncementNotification();
  const navigate = useNavigate();

  const [nickname, setNickname] = useState<string>(user?.nickname || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    if (!isStandalone()) {
      logPwaImpression('profile_menu');
    }
  }, []);

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

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-app flex-col bg-slate-50 font-sans text-slate-800">
      {/* 상단 바 */}
      <AppMainHeader title="내 정보" />

      <main className="flex flex-1 flex-col gap-[14px] px-4 pt-1 pb-screen-nav">
        {/* 프로필 아바타 영역 (ProfileHeader) */}
        <ProfileHeader
          nickname={user?.nickname || '사용자'}
          dayuColor={parseUserDayuColor(user?.profileImageUrl)}
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
              className="h-[50px] min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-[15.5px] text-slate-800 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none"
            />
            <Button type="submit" className="shrink-0" disabled={isUpdating || !nickname.trim() || nickname.trim() === user?.nickname}>
              {isUpdating ? <Loader2 className="size-4 animate-spin" /> : '저장'}
            </Button>
          </div>
          <span className="text-[12.5px] text-slate-500">모임 피드와 공유 카드에 이 이름이 보여요</span>
          {errorMsg && <p className="text-[13px] text-red-700">{errorMsg}</p>}
          {successMsg && (
            <p className="flex items-center gap-1 text-[13px] text-emerald-700">
              <Check className="size-3.5" />
              {successMsg}
            </p>
          )}
        </form>

        {/* 서비스 설정 및 안내 메뉴 */}
        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white py-1.5 [&>button+button]:border-t [&>button+button]:border-slate-200">
          {!isStandalone() && (
            <button
              type="button"
              onClick={() => {
                logPwaGuideOpen('profile_menu');
                setShowInstallGuide(true);
              }}
              className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-sky-50 text-sky-600">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold text-slate-800">앱으로 편하게 쓰기</span>
                    <span className="rounded-full bg-blue-50 px-1.5 py-0.2 text-[11px] font-bold text-blue-600">
                      추천
                    </span>
                  </div>
                  <p className="text-[12.5px] text-slate-500">홈 화면에 추가하고 앱처럼 쓰기</p>
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-slate-400" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/announcements')}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="relative grid size-9 shrink-0 place-items-center rounded-[11px] bg-sky-50 text-sky-600">
                <Megaphone className="w-4 h-4" />
                {hasUnread && (
                  <span
                    className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-red-500"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-slate-800">새로운 소식</span>
                {hasUnread && (
                  <span className="rounded-full bg-red-50 px-1.5 py-0.2 text-[11px] font-bold text-red-600">
                    N
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/settings/notifications')}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-blue-50 text-blue-600">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[15px] font-semibold text-slate-800">미인증 알림</span>
                <p className="text-[12.5px] text-slate-500">매일 21:00에 알려드려요</p>
              </div>
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/about')}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-indigo-50 text-indigo-600">
                <Info className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold text-slate-800">dayuse 소개</span>
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/terms')}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-slate-100 text-slate-600">
                <FileText className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold text-slate-800">이용약관</span>
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/privacy')}
            className="flex w-full cursor-pointer items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-slate-100 text-slate-600">
                <Shield className="w-4 h-4" />
              </div>
              <span className="text-[15px] font-semibold text-slate-800">개인정보처리방침</span>
            </div>
            <ChevronRight className="size-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          type="button"
          onClick={logout}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-[15px] font-bold text-red-700 transition-colors hover:bg-red-50"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
      </main>

      {/* 모바일 하단 탭 바 (AppTabBar) */}
      <ScreenNav active="me" announcementDot={hasUnread} />

      <IosInstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => setShowInstallGuide(false)}
        initialPlatform={isIos() ? 'ios' : 'android'}
      />
    </div>
  );
};
