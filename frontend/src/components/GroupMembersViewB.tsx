import React, { useState } from 'react';
import { Copy, Check, MessageCircle, RefreshCw, Link2, Users } from 'lucide-react';
import type { GroupDetail } from '../types';
import { DayuAvatar } from './brand/DayuAvatar';
import { Button, Card, Chip, SectionHead } from './dayu/ui';
import { useToast } from '../context/ToastContext';
import { shareToKakao, isKakaoReady } from '../utils/kakao';
import { formatMonthDay } from '../utils/date';

interface GroupMembersViewBProps {
  group: GroupDetail;
  inviteUrl: string;
  isHost: boolean;
  onRefreshInviteCode: () => void;
  isRefreshing: boolean;
  currentUserId?: number;
  verifiedUserIds?: Set<number>;
}

export const GroupMembersViewB: React.FC<GroupMembersViewBProps> = ({
  group,
  inviteUrl,
  isHost,
  onRefreshInviteCode,
  isRefreshing,
  currentUserId,
  verifiedUserIds,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const displayInviteUrl = inviteUrl.includes('localhost')
    ? inviteUrl.replace(/https?:\/\/localhost:\d+/, 'https://dayuse.kr')
    : inviteUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(displayInviteUrl);
      setCopied(true);
      showToast('초대 링크가 복사되었습니다!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast(`초대 링크: ${displayInviteUrl}`, 'info');
    }
  };

  const handleKakaoShare = () => {
    if (isKakaoReady()) {
      const shared = shareToKakao({
        title: `'${group.name}' 모임에 초대합니다!`,
        description: '데이유에서 매일 습관을 인증하고 함께 목표를 달성해요.',
        linkUrl: displayInviteUrl,
      });
      if (shared) return;
    }
    handleCopyLink();
  };

  return (
    <div className="flex flex-col gap-[14px] pb-12">
      {/* 모임 초대 링크 관리 카드 */}
      <Card>
        <SectionHead icon={<Link2 className="size-4 text-blue-600" />} title="친구 초대" right="비공개 모임" />
        <p className="mt-2 text-[13px] text-slate-500">초대 링크를 받은 사람만 들어올 수 있어요.</p>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-[7px] pr-[7px] pl-[15px]">
          <span className="min-w-0 flex-1 truncate text-[14px] text-slate-600">{displayInviteUrl}</span>
          <Button size="sm" className="shrink-0" onClick={handleCopyLink}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? '복사 완료' : '복사'}
          </Button>
        </div>

        <Button variant="kakao" className="mt-3 w-full" onClick={handleKakaoShare}>
          <MessageCircle className="size-4 fill-[#191600]" />
          카카오톡으로 보내기
        </Button>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[13px] text-slate-500">
            코드 <b className="font-bold tracking-[0.06em] text-slate-800">{group.inviteCode || 'SAMPLE'}</b> · 7일 뒤 만료
          </span>
          {isHost && (
            <button
              type="button"
              onClick={onRefreshInviteCode}
              disabled={isRefreshing}
              className="flex cursor-pointer items-center gap-1.5 text-[12.5px] font-bold text-slate-500 transition-colors hover:text-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              새 코드 받기
            </button>
          )}
        </div>
      </Card>

      {/* 모임 멤버 목록 */}
      <Card className="pb-1">
        <SectionHead
          icon={<Users className="size-4 text-blue-600" />}
          title={`멤버 ${group.members.length}명`}
          right={`오늘 ${verifiedUserIds?.size || 0}명 인증`}
        />

        <div className="mt-1">
          {group.members.map((member, i) => {
            const isMe = currentUserId !== undefined && member.userId === currentUserId;
            const hasVerifiedToday = verifiedUserIds?.has(member.userId);

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 py-3 ${
                  isMe ? '-mx-2.5 rounded-[14px] bg-blue-50 px-2.5' : i > 0 ? 'border-t border-slate-200' : ''
                }`}
              >
                <DayuAvatar profileImageUrl={member.profileImageUrl} size={36} alt={member.nickname} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[14.5px] font-bold text-slate-800">{member.nickname}</span>
                    {isMe && <span className="shrink-0 text-[13px] font-bold text-slate-500">나</span>}
                    {member.role === 'HOST' && <Chip tone="host" className="shrink-0">모임장</Chip>}
                  </div>
                  <div className="truncate text-[13px] text-slate-500">
                    {formatMonthDay(member.joinedAt)} 가입 · 챌린지 {member.participatingChallengeCount ?? 0}개
                  </div>
                </div>
                <Chip tone={hasVerifiedToday ? 'ok' : 'warn'} className="shrink-0">
                  {hasVerifiedToday ? '오늘 완료' : '오늘 남음'}
                </Chip>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
