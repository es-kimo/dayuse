import { Trophy, Info } from '../components/screens/ScreenIcons';
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invitesApi, inviteStorage } from '../api/invites';
import { groupsApi } from '../api/groups';
import type { InviteInfo } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { AlertTriangle, Loader2, Home } from 'lucide-react';
import { Screen, ScreenAvatar, screenAssets } from '../components/screens/Screen';
import { usePageMeta } from '../hooks/usePageMeta';

export const InviteLandingPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAlreadyJoined, setIsAlreadyJoined] = useState<boolean>(false);

  // 모임 초대장 메타데이터 관리 (만료 시 og-expired, 정상 초대 시 og-invite)
  usePageMeta({
    isNotFound: isInvalid,
    customInviteGroupName: inviteInfo?.groupName,
    customInviteHostNickname: inviteInfo?.hostNickname,
  });

  useEffect(() => {
    const fetchInviteAndCheckMembership = async () => {
      if (!inviteCode) return;
      try {
        // 초대 링크 접속 시 향후 로그인/회원가입 플로우를 위해 세션 스토리지에 초대 코드 보관
        inviteStorage.set(inviteCode);
        const data = await invitesApi.getInviteInfo(inviteCode);
        setInviteInfo(data);

        // 로그인된 사용자인 경우, 내 모임 목록을 조회하여 이미 참여 중인지 확인
        if (isAuthenticated) {
          try {
            const myGroups = await groupsApi.getMyGroups();
            const joined = myGroups.some((g) => g.id === data.groupId);
            if (joined) {
              setIsAlreadyJoined(true);
            }
          } catch (groupErr) {
            console.warn('Failed to verify group membership:', groupErr);
          }
        }
      } catch (err: any) {
        console.error('Failed to load invite info:', err);
        setIsInvalid(true);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchInviteAndCheckMembership();
    }
  }, [inviteCode, isAuthenticated, authLoading]);

  const handleJoin = async () => {
    if (!inviteCode) return;

    if (!isAuthenticated) {
      inviteStorage.set(inviteCode);
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${inviteCode}`)}`);
      return;
    }

    setIsJoining(true);
    setErrorMessage('');
    setIsAlreadyJoined(false);
    try {
      const res = await invitesApi.joinGroup(inviteCode);
      inviteStorage.clear();
      navigate(`/groups/${res.groupId}`);
    } catch (err: any) {
      console.error('Failed to join group:', err);
      if (err.response?.status === 409) {
        setIsAlreadyJoined(true);
        setErrorMessage('이미 참여 중인 모임입니다.');
      } else {
        const msg = err.response?.data?.message || '모임 가입에 실패했습니다.';
        setErrorMessage(msg);
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToLogin = () => {
    if (inviteCode) {
      inviteStorage.set(inviteCode);
      navigate(`/login?redirect=${encodeURIComponent(`/invite/${inviteCode}`)}`);
    } else {
      navigate('/login');
    }
  };

  if (loading || authLoading) {
    return (
      <MobileLayout showHeader={false}>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (isInvalid || !inviteInfo) {
    return (
      <MobileLayout showHeader={false}>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">유효하지 않은 초대 링크</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">
            만료되었거나 모임장이 재발급하여 무효화된 초대 코드입니다.
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 mx-auto active:scale-[0.98] transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>내 모임 목록으로 가기</span>
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <Screen>
      <main className="flex-1 overflow-y-auto px-4 pt-7 pb-6 flex flex-col gap-4">
        <div className="flex flex-col items-center text-center gap-2">
          <img src={screenAssets.invite} alt="" className="w-16 h-16 rounded-2xl shadow-xs mb-1" />
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
            {isAlreadyJoined ? '이미 참여 중인 모임' : '모임 초대장'}
          </span>
          <h1 className="text-xl font-extrabold text-slate-800">{inviteInfo.groupName}</h1>
          <p className="text-xs text-slate-500">
            모임장 <b className="text-slate-800 font-bold">{inviteInfo.hostNickname}</b>님이 초대했어요
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex items-center gap-3">
          <div className="flex -space-x-1.5 shrink-0">
            {inviteInfo.members?.slice(0, 4).map((m, i) => (
              <ScreenAvatar key={i} image={m.profileImageUrl} className="w-8 h-8 text-[10px]" />
            ))}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-slate-800">{inviteInfo.memberCount}명이 함께하고 있어요</div>
            <div className="text-xs text-slate-500 truncate">{inviteInfo.members?.map((m) => m.nickname).join(', ')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              진행 중인 챌린지
            </h3>
            <span className="text-xs font-medium text-slate-400">{inviteInfo.challenges?.length ?? 0}개</span>
          </div>
          {inviteInfo.challenges?.map((c, i) => (
            <div key={c.id} className="flex items-center gap-3 py-1">
              <div
                className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                  i % 2 ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600'
                }`}
              >
                {c.title.replace(/^(매일\s*)?\d*시?\s*/, '').slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-800 truncate">{c.title}</div>
                <div className="text-xs text-slate-500">
                  {c.periodType === 'WEEKLY_N' ? `주 ${c.targetFrequency}회` : '매일'} · {c.participantCount}명 참여
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-start gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed mt-1">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>들어가서 하고 싶은 챌린지만 골라 참여하면 돼요. 모든 챌린지를 할 필요는 없어요.</span>
          </div>
        </div>

        {errorMessage && !isAlreadyJoined && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-center" role="alert">
            {errorMessage}
          </p>
        )}
      </main>

      <footer className="p-4 pt-2 flex flex-col gap-2">
        <button
          className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
          disabled={isJoining}
          onClick={
            isAlreadyJoined
              ? () => navigate(`/groups/${inviteInfo.groupId}`)
              : isAuthenticated
                ? handleJoin
                : handleGoToLogin
          }
        >
          {isJoining
            ? '참여 처리 중...'
            : isAlreadyJoined
              ? '모임 홈으로 바로 가기'
              : isAuthenticated
                ? '모임 참여하기'
                : '카카오로 시작하고 참여하기'}
        </button>
        <button
          className="w-full h-11 rounded-xl text-slate-500 hover:text-slate-700 font-semibold text-xs transition cursor-pointer"
          onClick={() => navigate('/login')}
        >
          데이유즈 둘러보기
        </button>
      </footer>
    </Screen>
  );
};
