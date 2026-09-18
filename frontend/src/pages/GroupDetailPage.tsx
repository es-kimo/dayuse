import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { groupsApi } from '../api/groups';
import type { GroupDetail } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  ShieldAlert,
  Crown,
  User as UserIcon,
  Loader2,
} from 'lucide-react';

export const GroupDetailPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    const fetchGroup = async () => {
      if (!groupId) return;
      try {
        const data = await groupsApi.getGroupDetail(Number(groupId));
        setGroup(data);
      } catch (err: any) {
        console.error('Failed to fetch group detail:', err);
        if (err.response?.status === 403) {
          setErrorStatus(403);
        } else if (err.response?.status === 404) {
          setErrorStatus(404);
        } else {
          setErrorStatus(500);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const inviteUrl = group ? `${window.location.origin}/invite/${group.inviteCode}` : '';

  const handleCopyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshInviteCode = async () => {
    if (!group || !window.confirm('초대 코드를 재발급하시겠습니까?\n기존에 공유된 초대 링크는 즉시 무효화됩니다.')) {
      return;
    }
    setIsRefreshing(true);
    try {
      const refreshed = await groupsApi.refreshInviteCode(group.id);
      setGroup({
        ...group,
        inviteCode: refreshed.inviteCode,
        inviteCodeIssuedAt: refreshed.inviteCodeIssuedAt,
      });
      alert('새로운 초대 링크가 발급되었습니다.');
    } catch (err) {
      console.error('Failed to refresh invite code:', err);
      alert('초대 코드 재발급에 실패했습니다.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  if (errorStatus === 403) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">접근 권한이 없습니다</h2>
          <p className="text-xs text-slate-500 mb-6 max-w-xs">
            해당 모임의 멤버만 내용을 조회할 수 있습니다. (403 Forbidden)
          </p>
          <button
            onClick={() => navigate('/groups')}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            내 모임 목록으로 돌아가기
          </button>
        </div>
      </MobileLayout>
    );
  }

  if (!group || errorStatus === 404) {
    return (
      <MobileLayout>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-1">모임을 찾을 수 없습니다</h2>
          <button
            onClick={() => navigate('/groups')}
            className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium"
          >
            내 모임 목록으로
          </button>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      {/* 상단 헤더 */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate('/groups')}
          className="p-1 -ml-1 text-slate-500 hover:text-slate-800 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">{group.name}</h1>
        {group.isHost && (
          <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Crown className="w-3 h-3" />
            모임장
          </span>
        )}
      </div>

      {/* 초대 링크 관리 카드 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-700">모임 초대 링크</span>
          {group.isHost && (
            <button
              onClick={handleRefreshInviteCode}
              disabled={isRefreshing}
              className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              코드 재발급
            </button>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mb-2">
          비공개 모임입니다. 초대 링크를 받은 사람만 가입할 수 있습니다.
        </p>

        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={inviteUrl}
            className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-600 truncate outline-none select-all"
          />
          <button
            onClick={handleCopyLink}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow-xs transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '복사됨' : '복사'}</span>
          </button>
        </div>
      </div>

      {/* 모임 멤버 목록 */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-700">모임 멤버 ({group.members.length}명)</h2>
        </div>

        <div className="flex flex-col divide-y divide-slate-100">
          {group.members.map((member) => (
            <div key={member.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {member.profileImageUrl ? (
                  <img
                    src={member.profileImageUrl}
                    alt={member.nickname}
                    className="w-8 h-8 rounded-full object-cover border border-slate-100"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <div className="text-xs font-medium text-slate-800 flex items-center gap-1">
                    {member.nickname}
                    {member.role === 'HOST' && (
                      <span className="text-[9px] bg-amber-50 text-amber-700 px-1 py-0.2 rounded font-semibold">
                        모임장
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(member.joinedAt).toLocaleDateString()} 가입
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
};
