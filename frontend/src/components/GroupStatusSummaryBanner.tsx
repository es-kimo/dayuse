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
      <div className="bg-white rounded-lg border border-slate-200/80 p-4 shadow-xs flex items-center justify-between animate-pulse">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-3 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-7 w-20 bg-slate-200 rounded-md" />
      </div>
    );
  }

  if (!summary) return null;

  const hasUnchecked = summary.uncheckedCount > 0;
  const hasUnpaid = summary.unpaidPenaltyAmount > 0;

  return (
    <div className="bg-card rounded-lg border border-line p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {/* 미확인 기록 영역 */}
        <div className="flex items-start gap-2.5">
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
              hasUnchecked
                ? 'bg-warning-bg text-warning border border-warning-border'
                : 'bg-success-bg text-success border border-success-border'
            }`}
          >
            {hasUnchecked ? (
              <HelpCircle className="w-5 h-5 text-warning-icon" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-success-icon" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-body-sm font-semibold text-ink">
                미확인 기록{' '}
                <span className={hasUnchecked ? 'text-warning' : 'text-ink-secondary'}>
                  {summary.uncheckedCount}건
                </span>
              </span>
            </div>
            <p className="text-caption text-ink-muted mt-0.5">
              {hasUnchecked
                ? '지난 날짜 인증 누락 (익일 09시 전 등록 시 정상)'
                : '지난 기록을 모두 확인했어요'}
            </p>
          </div>
        </div>

        {/* 미확인 정리하기 버튼 */}
        {hasUnchecked && (
          <button
            onClick={onOpenUncheckedSheet}
            className="px-3 py-1.5 bg-warning hover:bg-amber-800 active:bg-amber-900 text-white text-xs font-semibold rounded-md shadow-xs transition flex items-center gap-1 shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-warning"
          >
            <span>정리하기</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 미납 벌금 요약 바 */}
      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-caption">
        <span className="text-ink-muted font-medium flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-ink-muted" />
          정산할 금액
        </span>
        <span
          className={`font-bold ${
            hasUnpaid ? 'text-danger text-sm' : 'text-ink'
          }`}
        >
          {summary.unpaidPenaltyAmount.toLocaleString()}원
        </span>
      </div>
    </div>
  );
};
