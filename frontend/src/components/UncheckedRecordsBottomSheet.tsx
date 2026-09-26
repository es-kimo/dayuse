import React, { useState } from 'react';
import type { UncheckedRecordItem } from '../types';
import { useGracePeriodTimer } from '../hooks/useGracePeriodTimer';
import {
  X,
  Calendar,
  AlertTriangle,
  Upload,
  XCircle,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface UncheckedRecordCardProps {
  record: UncheckedRecordItem;
  isBusy: boolean;
  onStartVerifyLate: (record: UncheckedRecordItem) => void;
  onMarkFailed: (recordId: number) => Promise<void>;
}

const UncheckedRecordCard: React.FC<UncheckedRecordCardProps> = ({
  record,
  isBusy,
  onStartVerifyLate,
  onMarkFailed,
}) => {
  const { isGracePeriod, formattedTime } = useGracePeriodTimer(record.date);

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-lg p-3.5 space-y-2.5 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{record.date} 대상 기록</span>
          </div>
          <span className="text-xs font-bold text-slate-700 mt-1 block">
            {record.challengeTitle}
          </span>
        </div>
        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
          미확인
        </span>
      </div>

      {/* 유예 시간 카운트다운 타이머 vs 마감 경과 안내 */}
      {isGracePeriod ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse shrink-0" />
          <span>
            정상 인정 마감까지 <b className="font-bold text-amber-700">{formattedTime}</b> 남음 (익일 09시)
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>유예 마감 경과 (인증 등록 시 지각으로 처리됩니다)</span>
        </div>
      )}

      {record.verificationCriteria && (
        <p className="text-[11px] text-slate-500 bg-white/80 p-2 rounded-md border border-slate-100">
          <span className="font-medium text-slate-600">기준:</span> {record.verificationCriteria}
        </p>
      )}

      <div className="flex items-center justify-between text-[11px] pt-1">
        <span className="text-slate-500">
          미수행 확정 시 벌금:{' '}
          <b className="text-red-600 font-bold">
            {record.penaltyAmount.toLocaleString()}원
          </b>
        </span>
      </div>

      {/* 액션 버튼 2개: 인증 올리기 vs 미수행 확정 */}
      <div className="flex gap-2 pt-1 border-t border-slate-200/60">
        <button
          onClick={() => onStartVerifyLate(record)}
          disabled={isBusy}
          className={`flex-1 py-2 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary ${
            isGracePeriod
              ? 'bg-primary hover:bg-primary-hover'
              : 'bg-warning hover:bg-amber-800'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isGracePeriod ? '인증 올리기 (정상 인정)' : '늦은 인증 올리기 (지각)'}</span>
        </button>
        <button
          onClick={() => onMarkFailed(record.id)}
          disabled={isBusy}
          className="flex-1 py-2 bg-slate-200 hover:bg-red-50 hover:text-red-600 text-slate-700 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <XCircle className="w-3.5 h-3.5" />
          )}
          <span>미수행 확정</span>
        </button>
      </div>
    </div>
  );
};

interface UncheckedRecordsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  records: UncheckedRecordItem[];
  loading: boolean;
  onMarkFailed: (recordId: number) => Promise<void>;
  onStartVerifyLate: (record: UncheckedRecordItem) => void;
}

export const UncheckedRecordsBottomSheet: React.FC<UncheckedRecordsBottomSheetProps> = ({
  isOpen,
  onClose,
  records,
  loading,
  onMarkFailed,
  onStartVerifyLate,
}) => {
  const [processingId, setProcessingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleMarkFailed = async (recordId: number) => {
    if (!window.confirm('이 날짜를 미수행으로 확정하시겠습니까?\n약정 벌금이 미납금에 부과됩니다.')) {
      return;
    }
    setProcessingId(recordId);
    try {
      await onMarkFailed(recordId);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-sheet bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* 상단 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-800">미확인 기록 정리</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              총 {records.length}건의 미확인 날짜가 있습니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="bg-amber-50/70 border-b border-amber-100 px-4 py-2.5 text-[11px] text-amber-800 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            지난 날짜의 인증 누락 건입니다. 익일 오전 9시 이전 등록 시 정상 인정되며, 이후 등록 시 지각 처리됩니다.
          </span>
        </div>

        {/* 목록 스크롤 영역 */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs">기록을 불러오는 중...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">모든 미확인 기록이 정리되었습니다!</span>
            </div>
          ) : (
            records.map((record) => (
              <UncheckedRecordCard
                key={record.id}
                record={record}
                isBusy={processingId === record.id}
                onStartVerifyLate={onStartVerifyLate}
                onMarkFailed={handleMarkFailed}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};
