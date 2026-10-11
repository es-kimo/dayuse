import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from '../ui/BottomSheet';
import { SheetGrab, Chip } from '../dayu/ui';
import React, { useState } from 'react';
import { X, CheckCircle2, Coins, Clock } from 'lucide-react';
import type { EndedChallengeSummaryItem } from '../../types';

export interface EndedChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: EndedChallengeSummaryItem[];
  onSelectChallenge: (item: EndedChallengeSummaryItem) => void;
  onSeedSamples?: () => Promise<void>;
}

export const EndedChallengesModal: React.FC<EndedChallengesModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectChallenge,
  onSeedSamples,
}) => {
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  return (
    <BottomSheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <>
        <div className="shrink-0 px-5 pt-2.5 pb-4">
          <SheetGrab />
          <div className="mt-3.5 flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <BottomSheetTitle className="text-[19px] font-extrabold text-slate-800">종료된 챌린지</BottomSheetTitle>
              <BottomSheetDescription className="mt-1 text-[13px] text-slate-500">함께한 도전의 결과를 확인해요.</BottomSheetDescription>
            </div>
            <BottomSheetClose aria-label="닫기" className="focus-ring grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100">
              <X className="size-[22px]" aria-hidden="true" />
            </BottomSheetClose>
          </div>
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-[13px] space-y-3">
              <p>아직 이 목록에 챌린지가 없어요.</p>

            </div>
          ) : (
            items.map((item) => {
              const isUnack = (!item.isAcknowledged || item.isRevised) && item.status !== 'PROVISIONAL';

              return (
                <button
                  key={item.challengeId}
                  type="button"
                  onClick={() => onSelectChallenge(item)}
                  className={`focus-ring w-full text-left p-4 rounded-[18px] border transition-colors cursor-pointer ${
                    isUnack
                      ? 'border-blue-100 bg-blue-50 hover:bg-blue-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {item.groupName && (
                        <span className="text-xs font-medium text-slate-500 mb-0.5 block">
                          {item.groupName}
                        </span>
                      )}
                      <h4 className="text-[15px] font-bold text-slate-800 leading-snug break-words">
                        {item.challengeTitle}
                      </h4>
                    </div>

                    {/* 배지 */}
                    <div className="shrink-0 flex items-center gap-1">
                      {item.status === 'PROVISIONAL' ? (
                        <Chip><Clock className="size-3" /> 집계 중</Chip>
                      ) : item.isRevised ? (
                        <Chip tone="warn">결과 수정됨</Chip>
                      ) : item.isAcknowledged ? (
                        <Chip><CheckCircle2 className="size-3" /> 확인 완료</Chip>
                      ) : (
                        <Chip tone="blue">확인 필요</Chip>
                      )}
                    </div>
                  </div>

                  {item.coinGrantStatus === 'GRANTED' && item.coinRewardCount > 0 && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold text-amber-700">
                      <Coins className="size-4" /> +{item.coinRewardCount.toLocaleString()} 코인
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* 푸터 보조 액션 */}
        {onSeedSamples && (
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">개발/테스트용 빠른 시드</span>
            <button
              type="button"
              disabled={isSeeding}
              onClick={async () => {
                try {
                  setIsSeeding(true);
                  await onSeedSamples();
                } finally {
                  setIsSeeding(false);
                }
              }}
              className="text-xs text-blue-700 hover:text-blue-800 font-bold underline cursor-pointer"
            >
              {isSeeding ? '데이터 생성 중...' : '+ 테스트용 종료 데이터 4건 추가'}
            </button>
          </div>
        )}
      </>
    </BottomSheet>
  );
};
