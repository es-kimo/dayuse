import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invitesApi, inviteStorage } from '../api/invites';
import { groupsApi } from '../api/groups';
import type { InviteInfo } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { Users, AlertTriangle, ArrowRight, Loader2, CheckCircle2, Home } from 'lucide-react';
import { DayuLogo } from '../components/brand/DayuLogo';
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
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 mx-auto active:scale-95 transition"
          >
            <Home className="w-3.5 h-3.5" />
            <span>내 모임 목록으로 가기</span>
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col justify-between py-12 px-2">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6">
            <DayuLogo variant="app-icon" className="w-14 h-14 rounded-2xl shadow-sm" />
          </div>

          {isAlreadyJoined ? (
            <span className="text-xs font-semibold text-success bg-success-bg border border-success-border px-3 py-1 rounded-full mb-3 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-success-icon" />
              이미 참여 중인 모임
            </span>
          ) : (
            <span className="text-xs font-semibold text-primary bg-primary-subtle border border-primary-muted px-3 py-1 rounded-full mb-3">
              모임 초대장
            </span>
          )}

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            '{inviteInfo.groupName}'
          </h1>
          <p className="text-xs text-slate-500 mb-6">
            모임장 <span className="font-semibold text-slate-700">{inviteInfo.hostNickname}</span>님의 초대를 받았습니다.
          </p>

          {/* 모임 정보 요약 카드 */}
          <div className="w-full bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-around shadow-xs mb-4">
            <div className="text-center">
              <span className="text-[11px] text-slate-400 block mb-1">현재 멤버</span>
              <span className="text-base font-bold text-slate-800 flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-slate-500" />
                {inviteInfo.memberCount}명
              </span>
            </div>
          </div>

          {isAlreadyJoined && (
            <div className="w-full p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-md mb-4 text-left flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <p className="font-semibold mb-0.5">이미 가입된 멤버입니다</p>
                <p className="text-[11px] text-emerald-700">
                  모임 홈으로 바로 이동하거나 내 모임 목록으로 돌아갈 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {errorMessage && !isAlreadyJoined && (
            <div className="w-full p-3 bg-red-50 text-red-600 text-xs rounded-md mb-4 text-center">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {isAlreadyJoined ? (
            <>
              <button
                onClick={() => navigate(`/groups/${inviteInfo.groupId}`)}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>모임 홈으로 바로 가기</span>
              </button>
              <button
                onClick={() => navigate('/groups')}
                className="w-full py-3 bg-card hover:bg-sunken border border-line text-ink font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Home className="w-3.5 h-3.5 text-ink-muted" />
                <span>내 모임 목록(홈)으로 가기</span>
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-line disabled:text-ink-disabled text-white font-semibold rounded-md text-body-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-primary-muted"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>참여 처리 중...</span>
                  </>
                ) : (
                  <>
                    <span>모임 참여하기</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => navigate('/groups')}
                className="w-full py-3 bg-card hover:bg-sunken border border-line text-ink font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Home className="w-3.5 h-3.5 text-ink-muted" />
                <span>홈으로 둘러보기</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleGoToLogin}
                className="w-full py-3.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold rounded-md text-body-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-primary-muted"
              >
                <span>로그인하고 모임 참여하기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/groups')}
                className="w-full py-3 bg-card hover:bg-sunken border border-line text-ink font-semibold rounded-md text-xs flex items-center justify-center gap-1.5 transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Home className="w-3.5 h-3.5 text-ink-muted" />
                <span>홈으로 둘러보기</span>
              </button>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};
