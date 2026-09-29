import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import type { GroupDetail } from '../types';
import { Dayu } from '../components/dayu/DayuAvatar';
import { Card, Button } from '../components/dayu/ui';
import { X, Copy, Check, MessageCircle, Trophy, ChevronRight, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { shareToKakao, isKakaoReady } from '../utils/kakao';

export const InviteCreatedPage: React.FC = () => {
  const { id, groupId } = useParams<{ id?: string; groupId?: string }>();
  const actualGroupId = Number(id || groupId);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!actualGroupId) return;

    const fetchGroupAndInvite = async () => {
      try {
        const detail = await groupsApi.getGroupDetail(actualGroupId);
        setGroup(detail);

        if (detail.inviteCode) {
          setInviteCode(detail.inviteCode);
        } else {
          // 초대 코드가 없으면 새로 발급
          const refreshed = await groupsApi.refreshInviteCode(actualGroupId);
          setInviteCode(refreshed.inviteCode);
        }
      } catch (err) {
        console.error('Failed to load group invite info:', err);
        showToast('모임 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchGroupAndInvite();
  }, [actualGroupId, showToast]);

  const inviteUrl = inviteCode
    ? `${window.location.origin}/invite/${inviteCode}`
    : '';

  const handleCopyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      showToast('초대 링크가 복사되었습니다!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(`초대 링크: ${inviteUrl}`, 'info');
    }
  };

  const handleKakaoShare = () => {
    if (!group || !inviteUrl) return;

    if (isKakaoReady()) {
      const shared = shareToKakao({
        title: `'${group.name}' 모임에 초대합니다!`,
        description: '데이유에서 매일 습관을 인증하고 함께 목표를 달성해요.',
        linkUrl: inviteUrl,
      });
      if (shared) return;
    }

    // fallback: 클립보드 복사
    handleCopyLink();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const groupName = group?.name || '새 모임';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col">
      {/* Header with Close Button */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3 h-14 bg-[#F8FAFC]/95 backdrop-blur-md">
        <div className="w-10" />
        <button
          onClick={() => navigate(`/groups/${actualGroupId}`)}
          aria-label="닫기"
          className="w-10 h-10 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100 transition active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Body */}
      <main className="w-full max-w-[390px] mx-auto px-5 pt-2 pb-12 flex flex-col gap-4.5">
        {/* Dayu Mascot & Headline */}
        <div className="flex flex-col items-center text-center gap-2 mt-3">
          <Dayu color="#2563EB" face="cheer" size={92} title="응원하는 데이유" />
          <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-slate-900 mt-1">
            모임을 만들었어요
          </h1>
          <p className="text-[14px] text-slate-500 break-keep">
            <strong className="text-slate-800 font-bold">{groupName}</strong>에 함께할 친구를 불러 보세요
          </p>
        </div>

        {/* Invite Link Card */}
        <Card className="flex flex-col gap-3">
          <div className="text-[13px] font-bold text-slate-500">
            초대 링크
          </div>

          <div className="flex items-center gap-2 p-[6px_6px_6px_14px] rounded-xl bg-[#F8FAFC] border border-slate-200">
            <span className="flex-1 min-w-0 text-[14px] text-slate-600 font-mono truncate select-all">
              {inviteUrl.replace(/^https?:\/\//, '')}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1 px-3 h-9 shrink-0 text-[13px]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '복사됨' : '링크 복사'}</span>
            </Button>
          </div>

          <div className="text-[13px] text-slate-500">
            초대 코드 <b className="text-slate-900 font-bold tracking-[0.08em]">{inviteCode}</b> · 7일 동안 쓸 수 있어요
          </div>

          <Button
            variant="kakao"
            size="md"
            onClick={handleKakaoShare}
            className="w-full gap-2 text-[14.5px]"
          >
            <MessageCircle className="w-4 h-4 fill-current shrink-0" />
            카카오톡으로 보내기
          </Button>
        </Card>

        {/* Create First Challenge Card */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/groups/${actualGroupId}/challenges/new`)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(`/groups/${actualGroupId}/challenges/new`);
            }
          }}
          className="rounded-[18px] border border-slate-200 bg-white p-4 flex items-center gap-3 cursor-pointer hover:border-slate-300 transition active:scale-[0.99] select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 grid place-items-center shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15.5px] font-bold text-slate-900 tracking-[-0.01em]">
              첫 챌린지 만들기
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5 truncate">
              친구가 들어오기 전에 만들어 둬도 돼요
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
        </div>
      </main>
    </div>
  );
};
