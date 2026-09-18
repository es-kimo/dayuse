import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { invitesApi } from '../api/invites';
import type { InviteInfo } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { Users, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export const InviteLandingPage: React.FC = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const fetchInviteInfo = async () => {
      if (!inviteCode) return;
      try {
        const data = await invitesApi.getInviteInfo(inviteCode);
        setInviteInfo(data);
      } catch (err: any) {
        console.error('Failed to load invite info:', err);
        setIsInvalid(true);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteInfo();
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      alert('모임에 가입하려면 먼저 로그인해야 합니다.');
      navigate('/login');
      return;
    }

    if (!inviteCode) return;

    setIsJoining(true);
    setErrorMessage('');
    try {
      const res = await invitesApi.joinGroup(inviteCode);
      navigate(`/groups/${res.groupId}`);
    } catch (err: any) {
      console.error('Failed to join group:', err);
      const msg = err.response?.data?.message || '모임 가입에 실패했습니다.';
      setErrorMessage(msg);
    } finally {
      setIsJoining(false);
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
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            내 모임 목록으로 가기
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout showHeader={false}>
      <div className="flex-1 flex flex-col justify-between py-12 px-2">
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mb-6 shadow-md shadow-blue-500/20">
            <Sparkles className="w-8 h-8" />
          </div>

          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
            모임 초대장
          </span>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            '{inviteInfo.groupName}'
          </h1>
          <p className="text-xs text-slate-500 mb-8">
            모임장 <span className="font-semibold text-slate-700">{inviteInfo.hostNickname}</span>님의 초대를 받았습니다.
          </p>

          {/* 모임 정보 요약 카드 */}
          <div className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-around shadow-xs mb-6">
            <div className="text-center">
              <span className="text-[11px] text-slate-400 block mb-1">현재 멤버</span>
              <span className="text-base font-bold text-slate-800 flex items-center justify-center gap-1">
                <Users className="w-4 h-4 text-slate-500" />
                {inviteInfo.memberCount}명
              </span>
            </div>
          </div>

          {errorMessage && (
            <div className="w-full p-3 bg-red-50 text-red-600 text-xs rounded-lg mb-4 text-center">
              {errorMessage}
            </div>
          )}
        </div>

        <div>
          {isAuthenticated ? (
            <button
              onClick={handleJoin}
              disabled={isJoining}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
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
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-95"
            >
              <span>로그인하고 모임 참여하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </MobileLayout>
  );
};
