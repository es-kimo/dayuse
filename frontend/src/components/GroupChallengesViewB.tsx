import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Check } from 'lucide-react';
import type { ChallengeSummary } from '../types';
import { DayuAvatar } from './brand/DayuAvatar';
import { Dayu } from './dayu/DayuAvatar';
import { Button, Card, Chip, Pill, ProgressBar, Segmented } from './dayu/ui';

interface GroupChallengesViewBProps {
  groupId: number;
  challenges: ChallengeSummary[];
  loading: boolean;
  currentUserId?: number;
}

type ScopeFilter = 'ALL' | 'MINE';
type StatusFilter = 'IN_PROGRESS' | 'NOT_STARTED' | 'ENDED';

export const GroupChallengesViewB: React.FC<GroupChallengesViewBProps> = ({
  groupId,
  challenges,
  loading,
}) => {
  const navigate = useNavigate();
  const [scope, setScope] = useState<ScopeFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('IN_PROGRESS');

  const myChallengesCount = useMemo(
    () => challenges.filter((c) => c.isParticipating).length,
    [challenges]
  );

  const scopeFiltered = useMemo(() => {
    if (scope === 'MINE') {
      return challenges.filter((c) => c.isParticipating);
    }
    return challenges;
  }, [challenges, scope]);

  const countByStatus = useMemo(() => {
    const counts = { IN_PROGRESS: 0, NOT_STARTED: 0, ENDED: 0 };
    scopeFiltered.forEach((c) => {
      if (c.status === 'IN_PROGRESS') counts.IN_PROGRESS++;
      else if (c.status === 'NOT_STARTED') counts.NOT_STARTED++;
      else if (c.status === 'ENDED' || c.status === 'ABORTED') counts.ENDED++;
    });
    return counts;
  }, [scopeFiltered]);

  const filteredChallenges = useMemo(() => {
    return scopeFiltered.filter((c) => {
      if (status === 'IN_PROGRESS') return c.status === 'IN_PROGRESS';
      if (status === 'NOT_STARTED') return c.status === 'NOT_STARTED';
      if (status === 'ENDED') return c.status === 'ENDED' || c.status === 'ABORTED';
      return true;
    });
  }, [scopeFiltered, status]);

  const calculateProgress = (c: ChallengeSummary) => {
    if (!c.startDate || !c.endDate) return { dayIndex: 1, totalDays: 30, percent: 50 };
    const start = new Date(c.startDate).getTime();
    const end = new Date(c.endDate).getTime();
    const now = new Date().getTime();
    const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const dayIndex = Math.min(totalDays, Math.max(1, Math.round((now - start) / (1000 * 60 * 60 * 24)) + 1));
    const percent = Math.min(100, Math.max(0, Math.round((dayIndex / totalDays) * 100)));
    return { dayIndex, totalDays, percent };
  };

  const formatDateRange = (start?: string, end?: string) => {
    if (!start || !end) return '';
    const parse = (d: string) => {
      const parts = d.split('-');
      if (parts.length >= 3) return `${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
      return d;
    };
    return `${parse(start)} ~ ${parse(end)}`;
  };

  return (
    <div className="space-y-3.5 pb-12">
      {/* 범위 세그먼트 (전체 / 내 참여) */}
      <Segmented
        label="챌린지 범위"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'ALL', label: `전체 ${challenges.length}` },
          { value: 'MINE', label: `내 참여 ${myChallengesCount}` },
        ]}
      />

      {/* 상태 필터 알약 + 만들기 버튼 */}
      <div className="flex items-center gap-2">
        <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-0.5">
          <Pill active={status === 'IN_PROGRESS'} onClick={() => setStatus('IN_PROGRESS')}>
            진행 중 {countByStatus.IN_PROGRESS}
          </Pill>
          <Pill active={status === 'NOT_STARTED'} onClick={() => setStatus('NOT_STARTED')}>
            예정 {countByStatus.NOT_STARTED}
          </Pill>
          <Pill active={status === 'ENDED'} onClick={() => setStatus('ENDED')}>
            종료 {countByStatus.ENDED}
          </Pill>
        </div>

        <Button size="sm" className="shrink-0" onClick={() => navigate(`/groups/${groupId}/challenges/new`)}>
          <Plus className="size-4" />
          만들기
        </Button>
      </div>

      {/* 챌린지 카드 목록 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse space-y-3">
              <div className="h-5 bg-slate-200 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-2/3" />
              <div className="h-2 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : filteredChallenges.length === 0 ? (
        <div className="my-4 flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-slate-300 bg-white p-8 text-center">
          <Dayu face="rest" size={64} />
          <div>
            <h4 className="text-[15.5px] font-bold text-slate-800">
              {status === 'IN_PROGRESS'
                ? '진행 중인 챌린지가 없어요'
                : status === 'NOT_STARTED'
                ? '시작 예정인 챌린지가 없어요'
                : '종료된 챌린지가 없어요'}
            </h4>
            <p className="mt-1 text-[13px] text-slate-500">새로운 목표를 세우고 모임원들과 함께 도전해 보세요!</p>
          </div>
          <Button size="sm" className="mt-2" onClick={() => navigate(`/groups/${groupId}/challenges/new`)}>
            첫 챌린지 만들기
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChallenges.map((c) => {
            const { dayIndex, totalDays, percent } = calculateProgress(c);
            const isCompletedToday = (c as any).isCompletedToday;

            return (
              <Card
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/challenges/${c.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/challenges/${c.id}`)}
                className="cursor-pointer text-left transition-colors hover:border-slate-300"
              >
                {/* 상단 칩 + 화살표 */}
                <div className="flex items-center gap-1.5">
                  <Chip tone="ok">● 진행 중</Chip>
                  <Chip tone="gray">{c.executionType === 'TOGETHER' ? '함께하기' : '각자하기'}</Chip>
                  {c.isParticipating && <Chip tone="blue">참여 중</Chip>}
                  <span className="flex-1" />
                  <ChevronRight className="size-4 shrink-0 text-slate-400" />
                </div>

                {/* 챌린지 타이틀 및 설명 */}
                <h3 className="mt-3 text-[17px] leading-[1.5] font-bold tracking-[-0.01em] text-slate-800">{c.title}</h3>
                {c.description && <p className="line-clamp-1 text-[13px] text-slate-500">{c.description}</p>}

                {/* 진행 막대 및 기간 */}
                <div className="mt-3 space-y-1.5">
                  <ProgressBar value={percent / 100} />
                  <div className="flex items-center justify-between text-[13px] text-slate-500">
                    <span>{formatDateRange(c.startDate, c.endDate)}</span>
                    <span className="tabular-nums">
                      <b className="font-bold text-slate-800">{dayIndex}일째</b> / {totalDays}일
                    </span>
                  </div>
                </div>

                {/* 하단 구분선 + 참여 인원 + 오늘 상태 칩 */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-[13px]">
                  <div className="flex min-w-0 items-center gap-2">
                    {!!c.participants?.length && (
                      <div className="flex shrink-0 -space-x-2">
                        {c.participants.slice(0, 3).map((participant) => (
                          <DayuAvatar
                            key={participant.userId}
                            profileImageUrl={participant.profileImageUrl}
                            alt={participant.nickname}
                            size={28}
                            className="border-2 border-white"
                          />
                        ))}
                      </div>
                    )}
                    <span className="whitespace-nowrap text-[13px] text-slate-500">{c.participantCount}명 참여</span>
                  </div>

                  {c.isParticipating &&
                    (isCompletedToday ? (
                      <Chip tone="ok">
                        <Check className="size-3.5" />
                        오늘 완료
                      </Chip>
                    ) : (
                      <Chip tone="warn">오늘 남음</Chip>
                    ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
