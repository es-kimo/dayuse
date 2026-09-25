import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/groups';
import type { GroupSummary } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { EmptyState } from '../components/EmptyState';
import { Plus, ChevronRight, Crown, Link as LinkIcon, Loader2 } from 'lucide-react';

export const GroupsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inviteInput, setInviteInput] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchGroups = async () => {
      try {
        const data = await groupsApi.getMyGroups();
        setGroups(data);
      } catch (err) {
        console.error('Failed to fetch groups:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchGroups();
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteInput.trim();
    if (!cleanCode) return;
    // URL 형태로 들어왔을 경우 코드만 추출
    const code = cleanCode.includes('/invite/') ? cleanCode.split('/invite/')[1] : cleanCode;
    navigate(`/invite/${code}`);
  };

  if (authLoading || loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-800">내 모임</h1>
        <button
          onClick={() => navigate('/groups/new')}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          모임 만들기
        </button>
      </div>

      {/* 초대 코드로 가입 입력 바 */}
      <form onSubmit={handleJoinByCode} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="invite-input"
            type="text"
            placeholder="초대 코드 또는 링크 입력"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-body-sm bg-card border border-line rounded-md outline-none focus:border-primary focus:ring-2 focus:ring-primary-muted text-ink placeholder:text-ink-muted"
          />
        </div>
        <button
          type="submit"
          className="min-h-[38px] px-3.5 py-2 bg-ink hover:bg-night text-white text-xs font-semibold rounded-md active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          가입
        </button>
      </form>

      {groups.length === 0 ? (
        <EmptyState
          expression="default"
          title="아직 참여한 모임이 없어요"
          description="모임을 만들거나 초대 코드로 들어가 보세요"
          actionText="모임 만들기"
          onAction={() => navigate('/groups/new')}
          secondaryActionText="초대 코드로 가입"
          onSecondaryAction={() => {
            const input = document.getElementById('invite-input');
            input?.focus();
          }}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="bg-card border border-line hover:border-primary-muted rounded-lg p-4 flex items-center justify-between cursor-pointer transition shadow-sm hover:shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary-subtle text-primary flex items-center justify-center font-bold text-base">
                  {group.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-body-sm text-ink">{group.name}</h2>
                    {group.role === 'HOST' && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-warning-bg text-warning border border-warning-border px-1.5 py-0.5 rounded-full font-semibold">
                        <Crown className="w-2.5 h-2.5" />
                        모임장
                      </span>
                    )}
                  </div>
                  <p className="text-caption text-ink-muted mt-0.5">멤버 {group.memberCount}명</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-ink-disabled" />
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
};
