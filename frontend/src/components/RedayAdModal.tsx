import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, PauseCircle, RotateCcw, Ticket } from 'lucide-react';
import { Modal, ModalClose, ModalDescription, ModalTitle } from './ui/Modal';
import { Button, Help, ProgressBar } from './dayu/ui';
import { DayuExpression } from './brand/DayuExpression';
import { X as ScreenX } from './screens/ScreenIcons';
import { redayApi, reportAdAbandonQuietly } from '../api/reday';
import { useAdWatchTimer } from '../hooks/useAdWatchTimer';
import {
  adFailureMessage,
  classifyAdFailure,
  describeAdStage,
  type RedayAdFailureReason,
} from '../utils/reday';
import type { AdSessionDetail, CompleteAdSessionResponse } from '../types';

/**
 * 자체 안내 광고 시청 모달 (v0.11 F11, F12)
 *
 * 상태를 세 단계로 분리해 보여준다: 시청 → `광고 완료` → `리데이 티켓 지급 완료`.
 * 티켓을 받은 뒤에도 벌금은 그대로이며, 면제는 호출부에서 사용자가 사용 버튼을 눌러야 일어난다.
 *
 * - 탭·앱이 보이지 않는 동안에는 시청 타이머가 멈춘다([useAdWatchTimer]).
 * - 모달을 닫으면 시청 중단을 서버에 알린다. 알림이 실패해도 세션은 서버 유효기간이 지나면 만료된다.
 */

interface RedayAdModalProps {
  dailyRecordId: number;
  /** 보상 지급이 끝난 뒤 호출된다. 티켓 사용(면제)은 호출부가 따로 확정한다. */
  onGranted: (result: CompleteAdSessionResponse) => void;
  onClose: () => void;
}

type Phase = 'loading' | 'watching' | 'granting' | 'granted' | 'failed';

export const RedayAdModal: React.FC<RedayAdModalProps> = ({
  dailyRecordId,
  onGranted,
  onClose,
}) => {
  const [open, setOpen] = useState(true);
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<AdSessionDetail | null>(null);
  const [failure, setFailure] = useState<RedayAdFailureReason>('UNKNOWN');

  const requiredSeconds = session?.requiredWatchSeconds ?? 0;
  const timer = useAdWatchTimer(requiredSeconds);
  // 제어 함수는 useCallback으로 고정되어 있다. 객체째로 의존성에 넣으면 매 렌더 재생성된다.
  const { start: startTimer, stop: stopTimer, reset: resetTimer } = timer;

  // 보상 지급이 끝난 세션은 중단 통보 대상이 아니다.
  const settledRef = useRef(false);
  const activeTokenRef = useRef<string | null>(null);
  const startedRef = useRef(false);

  const beginSession = useCallback(async () => {
    setPhase('loading');
    resetTimer();
    try {
      const issued = await redayApi.requestAdSession(dailyRecordId);
      if (!issued.available || !issued.session) {
        setFailure(issued.unavailableReason ?? 'NO_AVAILABLE_AD');
        setPhase('failed');
        return;
      }
      setSession(issued.session);
      activeTokenRef.current = issued.session.sessionToken;

      // 노출 기록은 실제로 화면에 띄운 직후에 보낸다. 서버의 최소 시청 시간 계산 기준점이다.
      await redayApi.recordAdImpression(issued.session.sessionToken);
      setPhase('watching');
      startTimer();
    } catch (error) {
      setFailure(classifyAdFailure(error));
      setPhase('failed');
    }
  }, [dailyRecordId, resetTimer, startTimer]);

  // 모달 인스턴스당 1회만 세션을 발급한다.
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void beginSession();
  }, [beginSession]);

  // 최소 시청 시간을 채우면 서버에 완료를 알리고 보상을 받는다.
  useEffect(() => {
    if (phase !== 'watching' || !timer.isSatisfied || !session) return;

    const token = session.sessionToken;
    const watchedSeconds = timer.watchedSeconds;
    setPhase('granting');
    stopTimer();

    void (async () => {
      try {
        const result = await redayApi.completeAdSession(token, watchedSeconds);
        settledRef.current = true;
        setPhase('granted');
        onGranted(result);
      } catch (error) {
        setFailure(classifyAdFailure(error));
        setPhase('failed');
      }
    })();
    // watchedSeconds는 매초 바뀌지만 phase가 'granting'으로 넘어가 재실행되지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timer.isSatisfied, session, onGranted, stopTimer]);

  // 모달이 사라질 때 아직 보상이 확정되지 않은 세션은 중단으로 통보한다.
  useEffect(() => {
    return () => {
      const token = activeTokenRef.current;
      if (token && !settledRef.current) {
        void reportAdAbandonQuietly(token);
      }
    };
  }, []);

  const requestClose = () => setOpen(false);

  const handleRetry = () => {
    const token = activeTokenRef.current;
    if (token && !settledRef.current) void reportAdAbandonQuietly(token);
    activeTokenRef.current = null;
    setSession(null);
    void beginSession();
  };

  const stage = timer.isPaused
    ? describeAdStage('paused', requiredSeconds)
    : phase === 'granted'
      ? describeAdStage('ticket-granted', requiredSeconds)
      : phase === 'granting'
        ? describeAdStage('ad-completed', requiredSeconds)
        : phase === 'failed'
          ? describeAdStage('failed', requiredSeconds)
          : describeAdStage('watching', requiredSeconds);

  const progress = requiredSeconds > 0 ? timer.watchedSeconds / requiredSeconds : 0;

  return (
    <Modal
      open={open}
      animateInitialOpen
      onOpenChange={setOpen}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) onClose();
      }}
      placement="bottom"
      backdropClassName="bg-slate-900/45"
      className="flex max-h-[92dvh] w-full max-w-app flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-[26px] bg-white px-5 pt-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:rounded-[26px]"
    >
      <div className="flex items-center justify-between gap-3">
        <ModalTitle className="text-[19px] font-extrabold tracking-[-0.02em] text-slate-800">리데이 티켓 받기</ModalTitle>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-blue-50 px-3 text-[13px] font-extrabold text-blue-600"><Ticket className="size-4 -rotate-12" />보상 +1장</span>
          <ModalClose aria-label="닫기" className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"><ScreenX className="size-5" /></ModalClose>
        </div>
      </div>
      <ModalDescription className="sr-only">안내 광고를 끝까지 보면 티켓 1장을 받아요. 벌금 면제는 티켓 사용 후 적용돼요.</ModalDescription>

      {phase === 'loading' ? (
        <div role="status" className="flex flex-col items-center gap-3 py-8 text-[13px] text-slate-500"><Loader2 className="size-6 animate-spin text-blue-600" />안내를 불러오고 있어요</div>
      ) : phase === 'failed' ? (
        <div className="flex flex-col items-center gap-4 py-5 text-center">
          <DayuExpression expression="rest" className="size-16" alt="" />
          <p role="alert" className="max-w-64 text-[14px] font-medium leading-relaxed text-slate-600">{adFailureMessage(failure)}</p>
        </div>
      ) : phase === 'granted' ? (
        <div role="status" className="flex flex-col items-center gap-3 py-5 text-center">
          <DayuExpression expression="done" className="size-16" alt="" />
          <p className="text-[21px] font-extrabold tracking-[-0.02em] text-slate-800">티켓 1장 받았어요!</p>
          <p className="text-[13px] text-slate-500">이제 티켓을 사용하면 벌금이 면제돼요.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-start gap-3">
            <DayuExpression expression="cheer" className="size-12 shrink-0" alt="" />
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-bold text-slate-400">{session?.creative.badgeText ?? '데이유 안내 광고'}</p>
              <h3 className="text-[16px] font-bold text-slate-800">{session?.creative.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{session?.creative.description}</p>
            </div>
          </div>
          {session?.creative.imageUrl && <img src={session.creative.imageUrl} alt="" className="max-h-40 w-full rounded-[14px] object-cover" />}
          <div className="space-y-2">
            <ProgressBar value={progress} tone={timer.isPaused ? 'warn' : 'blue'} />
            <div role="status" className="flex items-center justify-between gap-2 text-[12.5px] font-bold">
              <span className={timer.isPaused ? 'text-amber-700' : 'text-blue-600'}>
                {timer.isPaused && <PauseCircle className="mr-1 inline size-3.5" />}
                {phase === 'granting' ? '티켓 받는 중…' : stage.label}
              </span>
              <span className="tabular-nums text-slate-500">{Math.max(0, requiredSeconds - timer.watchedSeconds)}초 남음</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {phase === 'granted' ? (
          <Button size="lg" className="w-full" onClick={requestClose}>티켓 사용하러 가기</Button>
        ) : phase === 'failed' ? (
          <>
            {failure !== 'DAILY_LIMIT_REACHED' && <Button size="lg" className="w-full" onClick={handleRetry}><RotateCcw className="size-4" />다시 시도하기</Button>}
            <Button variant={failure === 'DAILY_LIMIT_REACHED' ? 'primary' : 'ghost'} size="lg" className="w-full" onClick={requestClose}>돌아가기</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" className="w-full" onClick={requestClose}>{phase === 'loading' ? '닫기' : '중단하고 닫기'}</Button>
            <Help className="text-center">시청 완료 → 티켓 1장 · 벌금 면제는 티켓 사용 후</Help>
          </>
        )}
      </div>
    </Modal>
  );
};
