import React, { useState } from 'react';
import type { ChallengePeriodInterval } from '../types';
import { challengesApi } from '../api/challenges';
import { AlertCircle, X } from 'lucide-react';

interface PeriodSettlementModalProps {
  groupId: number;
  challengeId: number;
  interval: ChallengePeriodInterval;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PeriodSettlementModal: React.FC<PeriodSettlementModalProps> = ({
  groupId,
  challengeId,
  interval,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await challengesApi.confirmPeriod(groupId, challengeId, interval.index);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || '구간 결과 확정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const missedCount = interval.missedCount ?? Math.max(0, interval.targetCount - interval.completedCount);
  const totalPenalty = interval.totalPenaltyAmount ?? (missedCount * (interval.penaltyAmountPerMiss ?? 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {interval.index}구간 미수행 확정
            </h3>
            <p className="text-xs text-slate-400">
              {interval.startDate} ~ {interval.endDate}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-md p-3.5 space-y-2 mb-4 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>목표 횟수</span>
            <span className="font-semibold text-slate-800">{interval.targetCount}회</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>달성 횟수</span>
            <span className="font-semibold text-slate-800">{interval.completedCount}회</span>
          </div>
          <div className="flex justify-between items-center text-rose-600 font-medium">
            <span>미수행 횟수</span>
            <span className="font-bold">{missedCount}회 부족</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
            <span className="text-slate-700 font-bold">확정 벌금</span>
            <span className="text-sm font-extrabold text-rose-600">
              {totalPenalty.toLocaleString()}원
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-500 mb-4 bg-amber-50/50 p-2.5 rounded-md border border-amber-100">
          💡 미수행 확정 시 정산 내역에 반영되어 입금 신고를 진행할 수 있습니다.
        </p>

        {error && (
          <div className="mb-3 p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-2.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-md text-xs font-semibold transition shadow-xs flex items-center justify-center gap-1.5"
          >
            {submitting ? '처리 중...' : '미수행 확정하기'}
          </button>
        </div>
      </div>
    </div>
  );
};
