import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useUiVersion } from '../context/UiVersionContext';
import { groupsApi } from '../api/groups';
import type { GroupSummary } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { BottomNav } from '../components/BottomNav';
import { EmptyState } from '../components/EmptyState';
import { DayuExpression } from '../components/brand/DayuExpression';
import { Button, Input, Tabs, TabsList, TabsTab, TabsPanel } from '../components/ui';
import { Plus, ChevronRight, Crown, Link as LinkIcon, Loader2 } from 'lucide-react';

export const GroupsPage: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { uiVersion } = useUiVersion();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inviteInput, setInviteInput] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'host'>('all');

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
    const code = cleanCode.includes('/invite/') ? cleanCode.split('/invite/')[1] : cleanCode;
    navigate(`/invite/${code}`);
  };

  const hostGroups = groups.filter((g) => g.role === 'HOST');

  // ==========================================
  // 신규 모바일 UI (B) 렌더링 (05-groups.html & 06-groupsEmpty.html)
  // ==========================================
  if (uiVersion === 'B') {
    return (
      <div className="max-w-app mx-auto min-h-dvh bg-slate-50 flex flex-col border-x border-slate-200 text-slate-800 font-sans relative">
        {/* 상단 헤더 바 */}
        <header className="sticky top-0 z-header h-14 bg-slate-50/95 backdrop-blur-xs border-b border-transparent flex items-center justify-between px-4">
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900">내 모임</h1>
          <button
            type="button"
            onClick={() => navigate('/groups/new')}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>만들기</span>
          </button>
        </header>

        <main className="flex-1 p-4 pb-12 flex flex-col gap-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-xs">모임 목록을 불러오는 중...</p>
            </div>
          ) : groups.length === 0 ? (
            /* 빈 상태 화면 (06-groupsEmpty.html) */
            <div className="py-16 text-center bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 shadow-2xs my-auto">
              <DayuExpression expression="default" color="blue" className="w-20 h-20 object-contain mx-auto" />
              <div>
                <h2 className="text-lg font-bold text-slate-900">아직 참여한 모임이 없어요</h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  친구와 모임을 만들거나, 받은 초대 코드로 들어가 보세요
                </p>
              </div>

              <div className="w-full space-y-2 pt-2 max-w-xs">
                <button
                  type="button"
                  onClick={() => navigate('/groups/new')}
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition active:scale-[0.98] shadow-sm cursor-pointer"
                >
                  모임 만들기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inp = document.getElementById('b-invite-input');
                    inp?.focus();
                  }}
                  className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition active:scale-[0.98] cursor-pointer"
                >
                  초대를 받았다면 들어가기
                </button>
              </div>
            </div>
          ) : (
            /* 모임 목록 화면 (05-groups.html) */
            <>
              {/* 필터 탭 */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeFilter === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  전체 {groups.length}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('host')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    activeFilter === 'host'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  내가 만든 {hostGroups.length}
                </button>
              </div>

              {/* 모임 리스트 카드 */}
              <div className="space-y-3">
                {(activeFilter === 'all' ? groups : hostGroups).map((group) => {
                  const isHost = group.role === 'HOST';
                  return (
                    <div
                      key={group.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/groups/${group.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/groups/${group.id}`);
                        }
                      }}
                      className="bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition shadow-2xs hover:shadow-xs focus-ring active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-extrabold text-lg shrink-0">
                          {group.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900 truncate">{group.name}</h3>
                            {isHost ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                                <Crown className="w-2.5 h-2.5" />
                                모임장
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium shrink-0">
                                참여 중
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">멤버 {group.memberCount}명</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* 초대 코드로 들어가기 인라인 카드 */}
          <form onSubmit={handleJoinByCode} className="mt-auto pt-4 border-t border-slate-200/80">
            <label htmlFor="b-invite-input" className="block text-xs font-bold text-slate-600 mb-2">
              초대 코드로 들어가기
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="b-invite-input"
                  type="text"
                  placeholder="초대 코드 또는 링크 입력"
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-hidden focus:border-blue-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={!inviteInput.trim()}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shrink-0"
              >
                가입
              </button>
            </div>
          </form>
        </main>

        {/* 바텀 네비게이션 바 */}
        <BottomNav />
      </div>
    );
  }

  // ==========================================
  // 기존 레거시 UI (A) 온전한 보존
  // ==========================================
  if (authLoading || loading) {
    return (
      <MobileLayout>
        <div className="flex-1 flex items-center justify-center" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 text-primary animate-spin" aria-hidden="true" />
          <span className="sr-only">모임 목록을 불러오는 중...</span>
        </div>
      </MobileLayout>
    );
  }

  const renderGroupList = (list: GroupSummary[], emptyDesc: string) => {
    if (list.length === 0) {
      return (
        <EmptyState
          expression="default"
          title="해당하는 모임이 없어요"
          description={emptyDesc}
          actionText="새 모임 만들기"
          onAction={() => navigate('/groups/new')}
        />
      );
    }
    return (
      <div className="flex flex-col gap-2.5">
        {list.map((group) => (
          <div
            key={group.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/groups/${group.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/groups/${group.id}`);
              }
            }}
            aria-label={`${group.name} 모임 상세 페이지로 이동, 멤버 ${group.memberCount}명`}
            className="bg-card border border-line hover:border-primary-muted rounded-lg p-4 flex items-center justify-between cursor-pointer transition shadow-sm hover:shadow focus-ring"
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
                      <Crown className="w-2.5 h-2.5" aria-hidden="true" />
                      모임장
                    </span>
                  )}
                </div>
                <p className="text-caption text-ink-muted mt-0.5">멤버 {group.memberCount}명</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-ink-disabled" aria-hidden="true" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <MobileLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-title-lg font-bold text-ink">내 모임</h1>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/groups/new')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          모임 만들기
        </Button>
      </div>

      {/* 초대 코드로 가입 입력 바 */}
      <form onSubmit={handleJoinByCode} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <LinkIcon className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <Input
            id="invite-input"
            type="text"
            placeholder="초대 코드 또는 링크 입력"
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="dark" size="md" className="shrink-0">
          가입
        </Button>
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
        <Tabs defaultValue="all">
          <TabsList aria-label="모임 필터">
            <TabsTab value="all">전체 모임 ({groups.length})</TabsTab>
            <TabsTab value="host">내가 만든 모임 ({hostGroups.length})</TabsTab>
          </TabsList>
          <TabsPanel value="all">
            {renderGroupList(groups, '참여 중인 모임이 없습니다.')}
          </TabsPanel>
          <TabsPanel value="host">
            {renderGroupList(hostGroups, '내가 모임장인 모임이 없습니다.')}
          </TabsPanel>
        </Tabs>
      )}
    </MobileLayout>
  );
};
