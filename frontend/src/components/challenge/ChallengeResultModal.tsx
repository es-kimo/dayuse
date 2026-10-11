import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Loader2 } from 'lucide-react';
import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from '../ui/BottomSheet';
import { SheetGrab, Button } from '../dayu/ui';
import { DayuExpression } from '../brand/DayuExpression';
import { CoinReward } from './CoinReward';
import { challengeResultApi } from '../../api/challengeResult';
import { useAuth } from '../../context/AuthContext';
import { useChallengeResultAcknowledgment } from '../../hooks/useChallengeResultAcknowledgment';
import type { ChallengeResultDetail, ChallengeParticipantResult } from '../../types';

export interface ChallengeResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  challengeId: number;
  onAcknowledged?: () => void;
}

export const ChallengeResultModal: React.FC<ChallengeResultModalProps> = ({
  isOpen,
  onClose,
  groupId,
  challengeId,
  onAcknowledged,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [animateReward, setAnimateReward] = useState(false);
  const [result, setResult] = useState<ChallengeResultDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadResult() {
      try {
        setLoading(true);
        setError(null);
        const data = await challengeResultApi.getResult(groupId, challengeId);
        if (isMounted) {
          setResult(data);
          const mine = data.participants.find((p) => p.userId === user?.id);
          setAnimateReward(data.status === 'CONFIRMED' && mine?.coinGrantStatus === 'GRANTED'
            && mine.coinRewardCount > 0 && !mine.isAcknowledged && !mine.isRevised);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : '결과를 불러오지 못했습니다.';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadResult();
    return () => {
      isMounted = false;
    };
  }, [isOpen, groupId, challengeId, user?.id]);

  const myParticipantResult =
    result?.participants.find((p) => p.userId === user?.id) || null;

  const handleAcknowledged = useCallback((updated: ChallengeParticipantResult) => {
    setResult((prev) => prev && ({ ...prev, participants: prev.participants.map((p) => p.userId === updated.userId ? updated : p) }));
    onAcknowledged?.();
  }, [onAcknowledged]);
  useChallengeResultAcknowledgment({
    groupId, challengeId, result: isOpen && !loading ? result : null,
    myParticipantResult, onAcknowledged: handleAcknowledged,
  });

  const granted = myParticipantResult?.coinGrantStatus === 'GRANTED' && myParticipantResult.coinRewardCount > 0;
  const pending = result?.status === 'PROVISIONAL' || myParticipantResult?.coinGrantStatus === 'PENDING';
  const aborted = result?.status === 'ABORTED';
  const headline = aborted ? '이번 도전은 여기까지' : pending ? '보상을 준비하고 있어요' : granted ? '해낸 만큼, 내 코인으로!' : '다음 도전에서 또 만나요';
  const description = aborted ? (result?.abortReason || '함께한 도전은 소중하게 남아 있어요.')
    : pending ? '보상이 확정되면 여기서 알려드릴게요.'
    : granted ? '꾸준히 쌓은 노력이 보상이 되었어요.'
    : '이번에는 코인 보상이 없어요. 가볍게 다시 시작해요.';
  const close = () => {
    window.dispatchEvent(new Event('dayu:coin-balance-changed'));
    onClose();
  };
  const go = (path: string) => { close(); navigate(path); };

  return (
    <BottomSheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <div className="relative shrink-0 px-5 pt-2.5">
        <SheetGrab />
        <BottomSheetClose aria-label="닫기" className="focus-ring absolute right-3 top-5 grid size-11 cursor-pointer place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
          <X className="size-5" />
        </BottomSheetClose>
      </div>
      <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pt-10 pb-6 text-center">
        <BottomSheetTitle className="text-[24px] font-extrabold tracking-tight text-slate-800">
          {loading ? '도전의 보상을 가져오는 중' : error || !result ? '잠시 연결이 어려워요' : headline}
        </BottomSheetTitle>
        <BottomSheetDescription className="mt-2 text-[14px] leading-relaxed text-slate-500">
          {loading ? '조금만 기다려 주세요.' : error || !result ? '잠시 후 다시 열어 주세요.' : description}
        </BottomSheetDescription>
        {loading ? <Loader2 aria-label="불러오는 중" className="mx-auto my-20 size-8 animate-spin text-blue-600" />
          : !error && result && (
            granted && !pending ? <CoinReward amount={myParticipantResult!.coinRewardCount} animate={animateReward && !aborted} />
              : <DayuExpression expression={pending ? 'default' : 'rest'} alt="" className="mx-auto my-12 size-28" />
          )}
      </div>
      {!loading && !error && result && (
        <div className="shrink-0 space-y-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button type="button" className="focus-ring w-full" onClick={() => go(`/groups/${groupId}/challenges/new`)}>
            다음 챌린지 시작하기 <ArrowRight className="size-4" />
          </Button>

        </div>
      )}
    </BottomSheet>
  );
};
