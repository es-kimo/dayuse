import React from 'react';
import type { StatusSummaryResponse } from '../types';
import { AlertCircle, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';

interface GroupStatusSummaryBannerProps {
  summary: StatusSummaryResponse | null;
  loading: boolean;
  onOpenUncheckedSheet: () => void;
}

export const GroupStatusSummaryBanner: React.FC<GroupStatusSummaryBannerProps> = ({
  summary,
  loading,
  onOpenUncheckedSheet,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-7 w-20 bg-slate-200 rounded-lg" />
      </div>
    );
  }

  if (!summary) return null;

  const hasUnchecked = summary.uncheckedCount > 0;
  const hasUnpaid = summary.unpaidPenaltyAmount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        {/* 미확인 기록 영역 */}
        <div className="flex items-start gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              hasUnchecked
                ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
            }`}
          >
            {hasUnchecked ? (
              <HelpCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">
                미확인 기록{' '}
                <span className={hasUnchecked ? 'text-amber-600' : 'text-slate-600'}>
                  {summary.uncheckedCount}건
                </span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {hasUnchecked
                ? '지난 날짜 인증 누락 (익일 09시 전 등록 시 정상)'
                : '모든 지난 기록이 완료되었습니다'}
            </p>
          </div>
        </div>

        {/* 미확인 정리하기 버튼 */}
        {hasUnchecked && (
          <button
            onClick={onOpenUncheckedSheet}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1 shrink-0"
          >
            <span>정리하기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 미납 벌금 요약 바 */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
          미수행 확정 벌금 (미납)
        </span>
        <span
          className={`font-bold ${
            hasUnpaid ? 'text-red-600 text-sm' : 'text-slate-700'
          }`}
        >
          {summary.unpaidPenaltyAmount.toLocaleString()}원
        </span>
      </div>
    </div>
  );
};
