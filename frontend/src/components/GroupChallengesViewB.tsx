import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plus, Check } from 'lucide-react';
import type { ChallengeSummary } from '../types';
import { Dayu, DayuAvatar } from './dayu/DayuAvatar';
import { parseDayuColor } from '../tokens/dayuColors';

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
  currentUserId,
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
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setScope('ALL')}
          className={`py-2 text-[14px] font-bold rounded-lg transition ${
            scope === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          전체 {challenges.length}
        </button>
        <button
          type="button"
          onClick={() => setScope('MINE')}
          className={`py-2 text-[14px] font-bold rounded-lg transition ${
            scope === 'MINE'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          내 참여 {myChallengesCount}
        </button>
      </div>

      {/* 상태 필터 칩 + 만들기 버튼 */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            type="button"
            onClick={() => setStatus('IN_PROGRESS')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
              status === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            진행 중 {countByStatus.IN_PROGRESS}
          </button>
          <button
            type="button"
            onClick={() => setStatus('NOT_STARTED')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
              status === 'NOT_STARTED'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            예정 {countByStatus.NOT_STARTED}
          </button>
          <button
            type="button"
            onClick={() => setStatus('ENDED')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 ${
              status === 'ENDED'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            종료 {countByStatus.ENDED}
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/groups/${groupId}/challenges/new`)}
          className="h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition active:scale-95 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>만들기</span>
        </button>
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
        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-8 text-center my-4 flex flex-col items-center gap-3">
          <Dayu face="rest" size={64} />
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {status === 'IN_PROGRESS'
                ? '진행 중인 챌린지가 없어요'
                : status === 'NOT_STARTED'
                ? '시작 예정인 챌린지가 없어요'
                : '종료된 챌린지가 없어요'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              새로운 목표를 세우고 모임원들과 함께 도전해 보세요!
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/groups/${groupId}/challenges/new`)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-700 transition"
          >
            첫 챌린지 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChallenges.map((c) => {
            const { dayIndex, totalDays, percent } = calculateProgress(c);
            const isCompletedToday = (c as any).isCompletedToday;

            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/challenges/${c.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/challenges/${c.id}`)}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs hover:border-blue-300 transition flex flex-col gap-3 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {/* 상단 칩 + 화살표 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                    ● 진행 중
                  </span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {c.executionType === 'TEAM' ? '함께하기' : '각자하기'}
                  </span>
                  {c.isParticipating && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                      참여 중
                    </span>
                  )}
                  <span className="flex-1" />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                {/* 챌린지 타이틀 및 설명 */}
                <div>
                  <h3 className="text-[16px] font-extrabold text-slate-900 tracking-tight leading-snug">
                    {c.title}
                  </h3>
                  {c.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {c.description}
                    </p>
                  )}
                </div>

                {/* 진행 막대 및 기간 */}
                <div className="space-y-1.5">
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{formatDateRange(c.startDate, c.endDate)}</span>
                    <span className="tabular-nums font-medium text-slate-500">
                      <b className="text-slate-800 font-bold">{dayIndex}일째</b> / {totalDays}일
                    </span>
                  </div>
                </div>

                {/* 하단 구분선 + 참여자 아바타 스택 + 오늘 완료 칩 */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {c.participantCount}명 참여
                    </span>
                  </div>

                  {c.isParticipating && (
                    <div>
                      {isCompletedToday ? (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          오늘 완료
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700">
                          오늘 남음
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
