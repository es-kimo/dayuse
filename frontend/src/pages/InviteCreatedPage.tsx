import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import type { GroupDetail } from '../types';
import { Dayu } from '../components/dayu/DayuAvatar';
import { Card, Button, RowText } from '../components/dayu/ui';
import { HeaderIconButton } from '../components/layout/AppHeader';
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
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const groupName = group?.name || '새 모임';

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-800">
      {/* Header with Close Button */}
      <header className="sticky top-0 z-20 mx-auto flex h-14 w-full max-w-app items-center justify-between bg-slate-50/92 pr-2.5 pl-3 backdrop-blur-md">
        <div className="flex-1" />
        <HeaderIconButton onClick={() => navigate(`/groups/${actualGroupId}`)} aria-label="닫기">
          <X className="size-[22px]" />
        </HeaderIconButton>
      </header>

      {/* Main Body */}
      <main className="mx-auto flex w-full max-w-app flex-col gap-[18px] px-5 pt-2 pb-[calc(3rem+env(safe-area-inset-bottom,0px))]">
        {/* Dayu Mascot & Headline */}
        <div className="mt-3 flex flex-col items-center text-center">
          <Dayu color="#2563EB" face="cheer" size={92} title="응원하는 데이유" />
          <h1 className="mt-2 text-[24px] leading-[1.3] font-extrabold tracking-[-0.03em] text-slate-800">
            모임을 만들었어요
          </h1>
          <p className="mt-[7px] text-[14px] break-keep text-slate-500">
            <strong className="font-bold text-slate-800">{groupName}</strong>에 함께할 친구를 불러 보세요
          </p>
        </div>

        {/* Invite Link Card */}
        <Card className="flex flex-col gap-3">
          <div className="text-[13px] font-bold text-slate-500">
            초대 링크
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-[7px] pr-[7px] pl-[15px]">
            <span className="min-w-0 flex-1 truncate text-[14px] text-slate-600 select-all">
              {inviteUrl.replace(/^https?:\/\//, '')}
            </span>
            <Button size="sm" onClick={handleCopyLink} className="shrink-0">
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? '복사됨' : '링크 복사'}
            </Button>
          </div>

          <div className="text-[13px] text-slate-500">
            초대 코드 <b className="font-bold tracking-[0.08em] text-slate-800">{inviteCode}</b> · 7일 동안 쓸 수 있어요
          </div>

          <Button variant="kakao" onClick={handleKakaoShare} className="w-full">
            <MessageCircle className="size-4 shrink-0 fill-current" />
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
          className="flex cursor-pointer items-center gap-3 rounded-[18px] border border-slate-200 bg-white p-4 transition-colors select-none hover:border-slate-300"
        >
          <div aria-hidden className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-blue-50 text-blue-600">
            <Trophy className="size-4" />
          </div>
          <RowText title="첫 챌린지 만들기" desc="친구가 들어오기 전에 만들어 둬도 돼요" />
          <ChevronRight className="size-[22px] shrink-0 text-slate-400" />
        </div>
      </main>
    </div>
  );
};
