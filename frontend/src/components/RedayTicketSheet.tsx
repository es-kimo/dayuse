import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import {
  BottomSheet,
  BottomSheetClose,
  BottomSheetDescription,
  BottomSheetTitle,
} from './ui/BottomSheet';
import { Button, SheetGrab } from './dayu/ui';
import { X as ScreenX } from './screens/ScreenIcons';
import { DayuExpression } from './brand/DayuExpression';
import { RedayAdModal } from './RedayAdModal';
import { redayApi } from '../api/reday';
import { useRedayRecord } from '../hooks/useRedayRecord';
import { useExperiment } from '../hooks/useExperiment';
import { useExperimentExposure } from '../hooks/useExperimentExposure';
import { shouldRecordExposure } from '../utils/experiment';
import { REDAY_GUIDE_COPY_EXPERIMENT, resolveRedayGuideCopy } from '../constants/experiments';
import { track } from '../utils/tracker';
import { formatMonthDay } from '../utils/date';
import {
  classifyAdFailure,
  describePenalty,
  formatRedayRemaining,
  adFailureMessage,
  type RedayAdFailureReason,
} from '../utils/reday';
import type { CompleteAdSessionResponse } from '../types';

/**
 * 리데이 안내 및 티켓 사용 시트 (v0.11 F11, F12, F13)
 *
 * 한 화면에서 두 경로를 모두 끝까지 갈 수 있다.
 * 1. 보유 티켓 즉시 사용: `리데이 티켓 1장 사용하기`
 * 2. 광고 시청 후 획득·사용: `광고 보고 리데이 티켓 받기` → 티켓 지급 → 사용 버튼
 *
 * 광고 시청 완료만으로는 벌금이 면제되지 않는다. 지급된 티켓을 사용자가 사용해야 면제된다.
 *
 * 분석 이벤트는 역할을 나눈다.
 * - 지급·사용·완료는 서버가 실제 최초 처리 시점에 적재한다(재시도 중복 집계 방지).
 * - 화면은 서버에 대응물이 없는 진입 행동(`recovery_started`)만 기록하고,
 *   여기에 실험 Context를 실어 문구 실험의 전환으로 연결한다.
 */

interface RedayTicketSheetProps {
  open: boolean;
  dailyRecordId: number;
  /** 대상 날짜(YYYY-MM-DD). 안내에 "어느 날짜의 벌금인지"를 반드시 보여준다. */
  targetDate?: string;
  challengeTitle?: string;
  onClose: () => void;
  /** 리데이 적용이 확정된 뒤 호출된다. 호출부가 기록·달력을 다시 불러온다. */
  onApplied?: () => void;
}

export const RedayTicketSheet: React.FC<RedayTicketSheetProps> = ({
  open,
  dailyRecordId,
  targetDate,
  challengeTitle,
  onClose,
  onApplied,
}) => {
  const {
    eligibility,
    availableTicketCount,
    action,
    remainingSeconds,
    loading,
    loadFailed,
    refresh,
  } = useRedayRecord(dailyRecordId, open);

  const [showAdModal, setShowAdModal] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [grantedTicketId, setGrantedTicketId] = useState<number | null>(null);
  const [failure, setFailure] = useState<RedayAdFailureReason | null>(null);

  // 실험은 문구·구성만 바꾼다. 배정 조회가 실패하면 기본 문구(A)로 동작한다.
  const experiment = useExperiment(REDAY_GUIDE_COPY_EXPERIMENT, open);
  const copy = resolveRedayGuideCopy(experiment);
  // 안내가 실제로 화면에 떠 있는 동안만 Exposure로 인정한다.
  const guideVisible = open && !loading && !loadFailed && eligibility !== null;
  useExperimentExposure(experiment, guideVisible);

  const penalty = describePenalty(eligibility?.penaltyStatus, eligibility?.penaltyAmount ?? 0);
  const experimentContext = shouldRecordExposure(experiment) ? experiment : undefined;

  // 시트 1회 열림당 recovery_started를 한 번만 기록한다.
  const startedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      startedRef.current = false;
    }
  }, [open]);

  const trackStarted = useCallback(
    (entry: 'use_ticket' | 'watch_ad') => {
      if (startedRef.current) return;
      startedRef.current = true;
      track(
        'recovery_started',
        {
          dailyRecordId,
          challengeId: eligibility?.challengeId ?? null,
          entry,
          availableTicketCount,
        },
        experimentContext
      );
    },
    [dailyRecordId, eligibility?.challengeId, availableTicketCount, experimentContext]
  );

  const handleUseTicket = async () => {
    if (applying) return;
    trackStarted('use_ticket');
    setApplying(true);
    setFailure(null);
    try {
      await redayApi.applyReday({
        dailyRecordId,
        ticketId: grantedTicketId ?? undefined,
      });
      setApplied(true);
      await refresh();
      onApplied?.();
    } catch (error) {
      setFailure(classifyAdFailure(error));
    } finally {
      setApplying(false);
    }
  };

  const handleWatchAd = () => {
    trackStarted('watch_ad');
    setFailure(null);
    setShowAdModal(true);
  };

  const handleGranted = (result: CompleteAdSessionResponse) => {
    // 지급된 티켓은 사용 확정 전까지 자동으로 소비되지 않는다. 사용 버튼을 누를 때 이 ID를 쓴다.
    setGrantedTicketId(result.grantedTicketId);
  };

  const recordDate = targetDate || eligibility?.targetDate;
  const showCountdown = !applied && action.kind !== 'applied' && remainingSeconds > 0;

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={(next) => !next && onClose()}
        disablePointerDismissal={applying}
      >
        <>
          <div className="flex shrink-0 flex-col gap-3 px-5 pt-2.5">
            <SheetGrab />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px] font-extrabold tracking-[-0.01em] text-slate-800">리데이</span>
              <div className="flex items-center gap-2">
                <div
                  role="status"
                  aria-label={`보유 리데이 티켓 ${loadFailed ? '조회 실패' : loading || !eligibility ? '확인 중' : `${availableTicketCount}장`}`}
                  className="flex h-10 items-center gap-2 rounded-full border border-blue-100 bg-blue-50 py-1 pl-1 pr-3.5 shadow-[0_2px_0_0_#DBEAFE]"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-sm">
                    <Ticket className="size-[18px] -rotate-12" />
                  </span>
                  <span className="text-[11px] font-bold text-blue-600">보유</span>
                  <span className="text-[18px] font-extrabold tabular-nums leading-none text-slate-800">
                    {loadFailed ? '—' : loading || !eligibility ? '…' : availableTicketCount}
                    <span className="ml-0.5 text-[12px] font-bold text-slate-500">장</span>
                  </span>
                </div>
                <BottomSheetClose
                  aria-label="닫기"
                  disabled={applying}
                  className="focus-ring grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-40"
                >
                  <ScreenX className="size-5" />
                </BottomSheetClose>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pt-5 pb-5">
            <div className="flex items-start gap-3">
              <div className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-blue-50">
                <DayuExpression expression={applied || action.kind === 'applied' ? 'done' : 'cheer'} className="size-11" alt="" />
              </div>
              <div className="min-w-0 flex-1">
                <BottomSheetTitle className="text-[21px] font-extrabold leading-[1.35] tracking-[-0.03em] text-slate-800">
                  {applied || action.kind === 'applied' ? '벌금 면제 완료!' : copy.headline}
                </BottomSheetTitle>
                <BottomSheetDescription className="mt-2 text-[13px] leading-[1.6] text-slate-500">
                  {applied || action.kind === 'applied' ? '지각 기록은 유지돼요.' : '티켓 1장으로 벌금 면제 · 지각 기록은 유지'}
                </BottomSheetDescription>
              </div>
            </div>
            {loading && !eligibility ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <span className="text-[13px]">리데이 정보를 불러오는 중...</span>
              </div>
            ) : loadFailed && !eligibility ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="size-7 text-slate-400" />
                <p className="text-[14px] font-bold text-slate-800">
                  리데이 정보를 불러오지 못했어요.
                </p>
                <Button variant="line" onClick={() => void refresh()}>
                  <RotateCcw className="size-4" />
                  다시 시도하기
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2 py-2">
                  <p className="text-[13px] text-slate-500">
                    {recordDate ? formatMonthDay(recordDate) : '대상 기록'}
                    {challengeTitle && <span className="ml-1.5 break-words">· {challengeTitle}</span>}
                  </p>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[14px] font-medium text-slate-600">{penalty.label}</span>
                    <span className="text-[28px] font-extrabold leading-tight tracking-[-0.03em] tabular-nums text-slate-800">{penalty.amount.toLocaleString()}<span className="ml-1 text-[15px] font-bold">원</span></span>
                  </div>
                  {!applied && action.kind !== 'applied' && (
                    <p className="flex items-center justify-end gap-1 text-[12.5px] tabular-nums text-slate-500">
                      <Clock className="size-3.5" />
                      {showCountdown ? formatRedayRemaining(remainingSeconds) : '기한 종료'}
                    </p>
                  )}
                </div>

                {/* 리데이 완료 또는 불가 사유 안내 */}
                {applied || action.kind === 'applied' ? null : action.kind === 'blocked' ? (
                  <p className="flex items-start gap-2 text-[13px] leading-relaxed text-slate-500">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {action.message}
                  </p>
                ) : (
                  <>
                    {grantedTicketId !== null && (
                      <p role="status" className="flex items-center justify-center gap-1.5 text-[13px] font-bold text-blue-600">
                        <Ticket className="size-4" />
                        티켓 +1장 · 아래에서 사용하세요
                      </p>
                    )}

                    {failure && (
                      <p role="alert" className="text-[13px] text-red-600">
                        {adFailureMessage(failure)}
                      </p>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* 하단 동작 */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 bg-white px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
            {applied || action.kind === 'applied' ? (
              <Button size="lg" className="w-full" onClick={onClose}>
                확인
              </Button>
            ) : action.kind === 'blocked' ? (
              <Button variant="line" size="lg" className="w-full" onClick={onClose}>
                돌아가기
              </Button>
            ) : availableTicketCount > 0 || grantedTicketId !== null ? (
              <Button size="lg" className="w-full" onClick={handleUseTicket} disabled={applying}>
                {applying ? <Loader2 className="size-4 animate-spin" /> : <Ticket className="size-4" />}
                티켓 1장 사용하기
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={handleWatchAd} disabled={loading}>
                광고 보고 티켓 1장 받기
              </Button>
            )}
          </div>
        </>
      </BottomSheet>

      {showAdModal && (
        <RedayAdModal
          dailyRecordId={dailyRecordId}
          onGranted={handleGranted}
          onClose={() => {
            setShowAdModal(false);
            // 지급 결과와 잔액을 서버 값으로 되맞춘다. 화면을 나갔다 돌아와도 같은 상태가 보인다.
            void refresh();
          }}
        />
      )}
    </>
  );
};
