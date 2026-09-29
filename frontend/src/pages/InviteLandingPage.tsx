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

  return <Screen>
    <main className="body" style={{ paddingTop: 28, gap: 18 }}>
      <div className="center" style={{ gap: 10 }}>
        <img src={screenAssets.invite} alt="" style={{ width: 64, height: 64, borderRadius: 18 }} />
        <span className="chip blue">{isAlreadyJoined ? '이미 참여 중인 모임' : '모임 초대장'}</span>
        <h1 className="h1">{inviteInfo.groupName}</h1>
        <p className="sub">모임장 <b style={{ color: 'var(--ink)' }}>{inviteInfo.hostNickname}</b>님이 초대했어요</p>
      </div>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="stack">{inviteInfo.members?.slice(0, 4).map((m, i) => <ScreenAvatar key={i} image={m.profileImageUrl} />)}</div>
        <div className="grow"><div className="t1">{inviteInfo.memberCount}명이 함께하고 있어요</div><div className="t2">{inviteInfo.members?.map(m => m.nickname).join(', ')}</div></div>
      </div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="sec" style={{ margin: 0 }}><h3><Trophy className="ic s" />진행 중인 챌린지</h3><span>{inviteInfo.challenges?.length ?? 0}개</span></div>
        {inviteInfo.challenges?.map((c, i) => <div key={c.id} className="row"><div className="gi" style={{ width: 38, height: 38, fontSize: 14, ...(i % 2 ? { background: '#F1F5F9', color: '#475569' } : {}) }}>{c.title.replace(/^(매일\s*)?\d*시?\s*/, '').slice(0, 1)}</div><div className="grow"><div className="t1" style={{ fontSize: 14.5 }}>{c.title}</div><div className="t2">{c.periodType === 'WEEKLY_N' ? `주 ${c.targetFrequency}회` : '매일'} · {c.participantCount}명 참여</div></div></div>)}
        <div className="notice soft"><Info className="ic s" /><span>들어가서 하고 싶은 챌린지만 골라 참여하면 돼요. 모든 챌린지를 할 필요는 없어요.</span></div>
      </div>
      {errorMessage && !isAlreadyJoined && <p className="error" role="alert">{errorMessage}</p>}
    </main>
    <footer className="foot" style={{ flexDirection: 'column', border: 0, background: 'transparent' }}>
      <button className="btn lg w100" disabled={isJoining} onClick={isAlreadyJoined ? () => navigate(`/groups/${inviteInfo.groupId}`) : isAuthenticated ? handleJoin : handleGoToLogin}>{isJoining ? '참여 처리 중...' : isAlreadyJoined ? '모임 홈으로 바로 가기' : isAuthenticated ? '모임 참여하기' : '카카오로 시작하고 참여하기'}</button>
      <button className="btn line w100" onClick={() => navigate('/login')} style={{ height: 44, border: 0, background: 'transparent', color: 'var(--ink3)', fontWeight: 600 }}>데이유즈 둘러보기</button>
    </footer>
  </Screen>;
};
