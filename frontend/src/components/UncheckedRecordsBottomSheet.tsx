import React, { useState } from 'react';
import type { UncheckedRecordItem } from '../types';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from './ui/BottomSheet';
import { useGracePeriodTimer } from '../hooks/useGracePeriodTimer';
import {
  X,
  Calendar,
  Upload,
  Loader2,
  CheckCircle2,
  Clock,
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
  const { isGracePeriod } = useGracePeriodTimer(record.date);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{record.date} 대상 기록</span>
        </span>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
            isGracePeriod
              ? 'bg-amber-50 text-amber-700'
              : 'bg-rose-50 text-rose-600'
          }`}
        >
          {isGracePeriod ? '9시 전 · 정상 인정' : '9시 지남 · 지각 처리'}
        </span>
      </div>

      <div className="text-[15px] font-extrabold text-slate-900">
        {record.challengeTitle}
      </div>

      {record.verificationCriteria && (
        <div className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
          <b className="text-slate-700 font-bold mr-1.5">인증 기준</b>
          <span>{record.verificationCriteria}</span>
        </div>
      )}

      {/* 액션 버튼 2개: 늦은 인증 올리기 vs 못 했어요 · 벌금 */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onStartVerifyLate(record)}
          disabled={isBusy}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-98 shadow-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>{isGracePeriod ? '인증 올리기' : '늦은 인증 올리기'}</span>
        </button>
        <button
          type="button"
          onClick={() => onMarkFailed(record.id)}
          disabled={isBusy}
          className="px-3.5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-xl text-xs font-bold transition active:scale-98 shrink-0 flex items-center justify-center gap-1"
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <span>못 했어요 · {(record.penaltyAmount || 0).toLocaleString()}원</span>
          )}
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

  /*
   * isOpen으로 조기 return하지 않는다.
   * 닫힐 때 바로 null을 반환하면 이탈 전환이 시작되기 전에 노드가 사라진다.
   * 닫힌 동안 내용이 렌더되지 않는 것은 BottomSheet(Base UI Portal)가 처리한다.
   */

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
    <BottomSheet open={isOpen} onOpenChange={(next) => !next && onClose()}>
      <>
        {/* 상단 헤더 */}
        <div className="flex items-start justify-between p-4 border-b border-slate-100 shrink-0">
          <div>
            <BottomSheetTitle className="text-[17px] font-extrabold text-slate-900">
              확인 안 된 기록 {records.length}건
            </BottomSheetTitle>
            <BottomSheetDescription className="text-xs text-slate-500 mt-0.5">
              지난 인증이 비어 있어요. 올리거나, 못 했다고 확정해 주세요.
            </BottomSheetDescription>
          </div>
          <BottomSheetClose
            aria-label="닫기"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md transition focus-ring"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </BottomSheetClose>
        </div>

        {/* 안내 문구 */}
        <div className="bg-amber-50/80 border-b border-amber-100 px-4 py-2.5 text-xs text-amber-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            다음 날 <b className="font-bold">오전 9시 전</b>에 올리면 정상 인증, 그 뒤에는 <b className="font-bold">지각</b>으로 기록돼요.
          </span>
        </div>

        {/* 목록 스크롤 영역 */}
        <div className="p-4 overflow-y-auto overscroll-contain space-y-3 flex-1">
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
      </>
    </BottomSheet>
  );
};
