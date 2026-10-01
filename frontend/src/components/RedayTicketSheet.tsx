import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
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
import { Button, Card, Chip, Help, Notice, SheetGrab, StatTile } from './dayu/ui';
import { X as ScreenX } from './screens/ScreenIcons';
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
  REDAY_EARN_BUTTON_LABEL,
  REDAY_USE_BUTTON_LABEL,
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

  const showCountdown = !applied && action.kind !== 'applied' && remainingSeconds > 0;

  return (
    <>
      <BottomSheet
        open={open}
        onOpenChange={(next) => !next && onClose()}
        disablePointerDismissal={applying}
      >
        <>
          <div className="flex shrink-0 flex-col gap-3.5 px-5 pt-2.5">
            <SheetGrab />
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <BottomSheetTitle className="text-[19px] font-extrabold tracking-[-0.01em] text-slate-800">
                  {applied || action.kind === 'applied' ? '리데이 완료' : copy.headline}
                </BottomSheetTitle>
                <BottomSheetDescription className="mt-1 text-[13px] leading-[1.5] text-slate-500">
                  {applied || action.kind === 'applied' ? action.message : copy.body}
                </BottomSheetDescription>
              </div>
              <BottomSheetClose
                aria-label="닫기"
                className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
              >
                <ScreenX className="size-[22px]" />
              </BottomSheetClose>
            </div>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-5 pt-3.5 pb-5">
            {loading && !eligibility ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-500">
                <Loader2 className="size-6 animate-spin text-blue-600" />
                <span className="text-[13px]">리데이 정보를 불러오는 중...</span>
              </div>
            ) : loadFailed && !eligibility ? (
              <Card className="flex flex-col items-center gap-3 py-8 text-center">
                <AlertCircle className="size-7 text-slate-400" />
                <p className="text-[14px] font-bold text-slate-800">
                  리데이 정보를 불러오지 못했어요.
                </p>
                <Button variant="line" onClick={() => void refresh()}>
                  <RotateCcw className="size-4" />
                  다시 시도하기
                </Button>
              </Card>
            ) : (
              <>
                {/* 대상 날짜 · 면제될 벌금 · 남은 기한 */}
                <Card className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-bold text-slate-800">
                      <CalendarDays className="size-3.5 text-slate-500" />
                      {targetDate ? formatMonthDay(targetDate) : eligibility?.targetDate}
                    </span>
                    <Chip tone={penalty.tone === 'exempted' ? 'ok' : penalty.tone === 'confirmed' ? 'bad' : 'warn'}>
                      {penalty.label}
                      {penalty.amount > 0 && ` · ${penalty.amount.toLocaleString()}원`}
                    </Chip>
                  </div>

                  {challengeTitle && (
                    <div className="text-[16px] font-bold tracking-[-0.01em] text-slate-800">
                      {challengeTitle}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <StatTile
                      label="보유 리데이 티켓"
                      value={`${availableTicketCount}장`}
                    />
                    <StatTile
                      label="남은 기한"
                      value={showCountdown ? formatRedayRemaining(remainingSeconds) : '기한 종료'}
                    />
                  </div>

                  <Notice icon={<Clock className="size-4" />}>
                    리데이를 사용해도 <b className="font-bold text-slate-800">지각 기록은 그대로 남아요</b>.
                    면제되는 건 이번 벌금뿐이에요.
                  </Notice>

                  {penalty.tone === 'pending' && (
                    <Help>
                      보류 중인 벌금은 아직 입금할 확정 금액에 포함되지 않아요.
                    </Help>
                  )}
                </Card>

                {/* 리데이 완료 또는 불가 사유 안내 */}
                {applied || action.kind === 'applied' ? (
                  <Card tone="done" className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-px size-5 shrink-0 text-emerald-700" />
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-bold text-slate-800">벌금이 면제됐어요</div>
                      <p className="mt-1 text-[13px] leading-[1.5] text-slate-600">{action.message}</p>
                    </div>
                  </Card>
                ) : action.kind === 'blocked' ? (
                  <Card className="flex items-start gap-2.5">
                    <AlertCircle className="mt-px size-5 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-bold text-slate-800">
                        지금은 리데이를 쓸 수 없어요
                      </div>
                      <p className="mt-1 text-[13px] leading-[1.5] text-slate-600">{action.message}</p>
                    </div>
                  </Card>
                ) : (
                  <>
                    {grantedTicketId !== null && (
                      <Card tone="hero" className="flex items-start gap-2.5">
                        <Ticket className="mt-px size-5 shrink-0 text-blue-600" />
                        <div className="min-w-0">
                          <div className="text-[14.5px] font-bold text-slate-800">
                            리데이 티켓 지급 완료
                          </div>
                          <p className="mt-1 text-[13px] leading-[1.5] text-slate-600">
                            아직 벌금은 면제되지 않았어요. 아래에서 사용해야 면제돼요.
                          </p>
                        </div>
                      </Card>
                    )}

                    {action.kind === 'watch-ad' && grantedTicketId === null && (
                      <Help>{copy.earnHint}</Help>
                    )}

                    {failure && (
                      <Notice icon={<AlertCircle className="size-4" />}>
                        {adFailureMessage(failure)}
                      </Notice>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* 하단 동작 */}
          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 pt-3 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
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
                {REDAY_USE_BUTTON_LABEL}
              </Button>
            ) : (
              <Button size="lg" className="w-full" onClick={handleWatchAd} disabled={loading}>
                {REDAY_EARN_BUTTON_LABEL}
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
