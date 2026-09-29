import React, { useState } from 'react';
import type { UncheckedRecordItem } from '../types';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from './ui/BottomSheet';
import { useGracePeriodTimer } from '../hooks/useGracePeriodTimer';
import { Button, Card, Chip, Notice, SheetGrab } from './dayu/ui';
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
    <Card className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
          <Calendar className="size-3.5 text-slate-500" />
          {record.date}
        </span>
        <Chip tone={isGracePeriod ? 'warn' : 'bad'}>
          {isGracePeriod ? '9시 전 · 정상 인정' : '9시 지남 · 지각 처리'}
        </Chip>
      </div>

      <div className="text-[16px] font-bold tracking-[-0.01em] text-slate-800">{record.challengeTitle}</div>

      {record.verificationCriteria && (
        <Notice>
          <b className="mr-1.5 font-bold text-slate-800">인증 기준</b>
          {record.verificationCriteria}
        </Notice>
      )}

      {/* 액션 버튼 2개: 늦은 인증 올리기 vs 못 했어요 · 벌금 */}
      <div className="flex gap-2">
        <Button type="button" className="flex-1" onClick={() => onStartVerifyLate(record)} disabled={isBusy}>
          <Upload className="size-4" />
          {isGracePeriod ? '인증 올리기' : '늦은 인증 올리기'}
        </Button>
        <Button type="button" variant="ghost" className="shrink-0" onClick={() => onMarkFailed(record.id)} disabled={isBusy}>
          {isBusy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            `못 했어요 · ${(record.penaltyAmount || 0).toLocaleString()}원`
          )}
        </Button>
      </div>
    </Card>
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
        {/* 상단 손잡이 · 제목 */}
        <div className="flex shrink-0 flex-col gap-3.5 px-5 pt-2.5">
          <SheetGrab />
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <BottomSheetTitle className="text-[19px] font-extrabold text-slate-800">
                확인 안 된 기록 {records.length}건
              </BottomSheetTitle>
              <BottomSheetDescription className="text-[13px] text-slate-500">
                지난 인증이 비어 있어요. 올리거나, 못 했다고 확정해 주세요.
              </BottomSheetDescription>
            </div>
            <BottomSheetClose
              aria-label="닫기"
              className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
            >
              <X className="size-[22px]" aria-hidden="true" />
            </BottomSheetClose>
          </div>

          {/* 안내 문구 */}
          <Notice icon={<Clock className="size-4" />}>
            다음 날 <b className="font-bold text-slate-800">오전 9시 전</b>에 올리면 정상 인증, 그 뒤에는{' '}
            <b className="font-bold text-slate-800">지각</b>으로 기록돼요.
          </Notice>
        </div>

        {/* 목록 스크롤 영역 */}
        <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="size-6 animate-spin text-blue-600" />
              <span className="text-[13px]">기록을 불러오는 중...</span>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <CheckCircle2 className="size-8 text-emerald-700" />
              <span className="text-[14px] font-bold text-slate-800">모든 미확인 기록이 정리되었습니다!</span>
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
