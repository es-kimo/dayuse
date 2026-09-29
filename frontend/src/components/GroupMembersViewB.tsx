import React, { useState } from 'react';
import { Copy, Check, MessageCircle, RefreshCw } from 'lucide-react';
import type { GroupDetail, GroupMember } from '../types';
import { DayuAvatar } from './dayu/DayuAvatar';
import { useToast } from '../context/ToastContext';
import { shareToKakao, isKakaoReady } from '../utils/kakao';

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
    <div className="space-y-4 pb-12">
      {/* 모임 초대 링크 관리 카드 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">모임 초대 링크</span>
          <span className="text-[11px] text-slate-400">초대 코드로 친구 부르기</span>
        </div>

        {/* 링크 & 코드 박스 */}
        <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">초대 코드</span>
            <span className="font-extrabold text-blue-600 tracking-wider">
              {group.inviteCode || 'SAMPLE'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate">
            {displayInviteUrl}
          </div>
        </div>

        {/* 버튼 액션: 링크 복사 + 카카오톡 공유 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '복사 완료' : '링크 복사'}</span>
          </button>
          <button
            type="button"
            onClick={handleKakaoShare}
            className="h-10 px-3 rounded-xl bg-[#FEE500] hover:bg-[#F5DC00] text-[#191600] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-[#191600]" />
            <span>카카오톡 공유</span>
          </button>
        </div>

        {/* 모임장: 새 코드 받기 */}
        {isHost && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>링크가 외부에 유출되었거나 만료되었나요?</span>
            <button
              type="button"
              onClick={onRefreshInviteCode}
              disabled={isRefreshing}
              className="text-slate-500 hover:text-blue-600 font-semibold flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>새 코드 받기</span>
            </button>
          </div>
        )}
      </div>

      {/* 모임 멤버 목록 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800">
            모임 멤버 ({group.members.length}명)
          </h3>
          <span className="text-[11px] text-slate-400">
            오늘 인증 {verifiedUserIds?.size || 0}명
          </span>
        </div>

        <div className="space-y-1.5 pt-1">
          {group.members.map((member) => {
            const isMe = currentUserId !== undefined && member.userId === currentUserId;
            const hasVerifiedToday = verifiedUserIds?.has(member.userId);

            return (
              <div
                key={member.id}
                className={`p-2.5 rounded-xl flex items-center justify-between transition ${
                  isMe ? 'bg-blue-50/60 border border-blue-100' : 'hover:bg-slate-50'
                }`}
              >
                {/* 프로필 아바타 + 닉네임 + 방장 배지 */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <DayuAvatar
                    profileImageUrl={member.profileImageUrl}
                    size={36}
                    alt={member.nickname}
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-800 truncate">
                        {member.nickname}
                      </span>
                      {isMe && (
                        <span className="text-[10px] font-bold text-blue-600">
                          · 나
                        </span>
                      )}
                      {member.role === 'HOST' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                          모임장
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 상태 칩 */}
                <div className="flex items-center gap-2 shrink-0">
                  {hasVerifiedToday ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      오늘 완료
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400">
                      인증 대기
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
