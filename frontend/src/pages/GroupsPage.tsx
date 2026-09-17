import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/groups';
import type { GroupSummary } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { EmptyState } from '../components/EmptyState';
import { Users, Plus, ChevronRight, Crown, Link as LinkIcon, Loader2 } from 'lucide-react';

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
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          모임 만들기
        </button>
      </div>

      {/* 초대 코드로 가입 입력 바 */}
      <form onSubmit={handleJoinByCode} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="초대 코드 또는 링크 입력"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg active:scale-95 transition"
        >
          가입
        </button>
      </form>

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="참여 중인 모임이 없습니다"
          description="새로운 비공개 모임을 만들거나 전달받은 초대 코드로 가입해 보세요."
          actionText="새 모임 만들기"
          onAction={() => navigate('/groups/new')}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => navigate(`/groups/${group.id}`)}
              className="bg-white border border-slate-200 hover:border-blue-300 rounded-xl p-4 flex items-center justify-between cursor-pointer transition shadow-xs hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-base">
                  {group.name.slice(0, 1)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-semibold text-sm text-slate-800">{group.name}</h2>
                    {group.role === 'HOST' && (
                      <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        <Crown className="w-2.5 h-2.5" />
                        모임장
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">멤버 {group.memberCount}명</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300" />
            </div>
          ))}
        </div>
      )}
    </MobileLayout>
  );
};
