import React from 'react';
import type { ChallengePeriodInterval } from '../types';
import { Award, AlertTriangle, CheckCircle2, ChevronRight, Clock, XCircle } from 'lucide-react';

interface ChallengePeriodSectionProps {
  intervals: ChallengePeriodInterval[];
  isParticipating: boolean;
  onOpenConfirmModal: (interval: ChallengePeriodInterval) => void;
}

export const ChallengePeriodSection: React.FC<ChallengePeriodSectionProps> = ({
  intervals,
  isParticipating,
  onOpenConfirmModal,
}) => {
  if (!intervals || intervals.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs mb-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Award className="w-4 h-4 text-blue-600" />
          <span>주차별 달성 및 정산 현황</span>
        </div>
        <span className="text-[10px] text-slate-400">총 {intervals.length}개 구간</span>
      </div>

      <div className="space-y-2.5">
        {intervals.map((interval) => {
          const missedCount = interval.missedCount ?? Math.max(0, interval.targetCount - interval.completedCount);
          const totalPenalty = interval.totalPenaltyAmount ?? 0;

          return (
            <div
              key={interval.index}
              className={`p-3 rounded-xl border transition ${
                interval.settlementStatus === 'ACHIEVED'
                  ? 'bg-emerald-50/30 border-emerald-200'
                  : interval.settlementStatus === 'NEEDS_CONFIRMATION'
                  ? 'bg-amber-50/40 border-amber-300'
                  : interval.settlementStatus === 'CONFIRMED_FAILED'
                  ? 'bg-rose-50/30 border-rose-200'
                  : 'bg-slate-50/50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    {interval.index}구간
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {interval.startDate} ~ {interval.endDate}
                  </span>
                </div>

                {/* 구간 상태 뱃지 */}
                {interval.settlementStatus === 'ACHIEVED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    목표 달성
                  </span>
                )}
                {interval.settlementStatus === 'IN_PROGRESS' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    진행 중
                  </span>
                )}
                {interval.settlementStatus === 'NEEDS_CONFIRMATION' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    결과 확인 필요
                  </span>
                )}
                {interval.settlementStatus === 'CONFIRMED_FAILED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-rose-600" />
                    미수행 확정
                  </span>
                )}
              </div>

              {/* 진행도 게이지 */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-600">
                    달성: <strong className="text-slate-800">{interval.completedCount}회</strong> / 목표 {interval.targetCount}회
                  </span>
                  <span className="text-slate-400 font-medium">
                    {Math.round((interval.completedCount / interval.targetCount) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      interval.isAchieved ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (interval.completedCount / interval.targetCount) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 정산 안내 및 액션 버튼 */}
              {interval.settlementStatus === 'NEEDS_CONFIRMATION' && (
                <div className="mt-2.5 pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-900">
                    <span>{missedCount}회 미수행</span>
                    {totalPenalty > 0 && (
                      <span className="font-bold ml-1 text-rose-600">
                        ({totalPenalty.toLocaleString()}원)
                      </span>
                    )}
                  </div>
                  {isParticipating && (
                    <button
                      onClick={() => onOpenConfirmModal(interval)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-bold rounded-lg transition shadow-2xs flex items-center gap-1"
                    >
                      <span>결과 확인하기</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {interval.settlementStatus === 'CONFIRMED_FAILED' && (
                <div className="mt-2 pt-2 border-t border-rose-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600">
                    부족 {missedCount}회에 대해 벌금이 확정되었습니다.
                  </span>
                  <span className="font-extrabold text-rose-600">
                    {totalPenalty.toLocaleString()}원
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
