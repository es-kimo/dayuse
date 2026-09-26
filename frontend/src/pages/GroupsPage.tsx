import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { groupsApi } from '../api/groups';
import type { GroupSummary } from '../types';
import { MobileLayout } from '../components/MobileLayout';
import { EmptyState } from '../components/EmptyState';
import { Button, Input, Tabs, TabsList, TabsTab, TabsPanel } from '../components/ui';
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
    const code = cleanCode.includes('/invite/') ? cleanCode.split('/invite/')[1] : cleanCode;
    navigate(`/invite/${code}`);
  };

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

  const hostGroups = groups.filter((g) => g.role === 'HOST');

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
