import { BottomSheet, BottomSheetTitle, BottomSheetDescription, BottomSheetClose } from '../ui/BottomSheet';
import { SheetGrab, Chip } from '../dayu/ui';
import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, Coins, Clock } from 'lucide-react';
import type { EndedChallengeSummaryItem } from '../../types';

export interface EndedChallengesModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: EndedChallengeSummaryItem[];
  onSelectChallenge: (item: EndedChallengeSummaryItem) => void;
  onSeedSamples?: () => Promise<void>;
}

type FilterTab = 'ALL' | 'UNACKNOWLEDGED' | 'ACKNOWLEDGED';

export const EndedChallengesModal: React.FC<EndedChallengesModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectChallenge,
  onSeedSamples,
}) => {
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  const filteredItems = useMemo(() => {
    switch (filterTab) {
      case 'UNACKNOWLEDGED':
        return items.filter((it) => (!it.isAcknowledged || it.isRevised) && it.status !== 'PROVISIONAL');
      case 'ACKNOWLEDGED':
        return items.filter((it) => it.isAcknowledged && !it.isRevised);
      case 'ALL':
      default:
        return items;
    }
  }, [items, filterTab]);

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

        {/* 탭 필터 (F04: 진행 중/종료/확인완료 상태별 탭 및 필터링) */}
        <div className="mx-5 mb-4 flex shrink-0 gap-1 rounded-xl bg-slate-100 p-1 text-[13px] font-bold">
          <button
            type="button"
            aria-pressed={filterTab === 'ALL'}
            onClick={() => setFilterTab('ALL')}
            className={`focus-ring min-h-11 flex-1 rounded-lg px-1 transition-colors cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            전체 ({items.length})
          </button>
          <button
            type="button"
            aria-pressed={filterTab === 'UNACKNOWLEDGED'}
            onClick={() => setFilterTab('UNACKNOWLEDGED')}
            className={`focus-ring min-h-11 flex-1 rounded-lg px-1 transition-colors cursor-pointer ${
              filterTab === 'UNACKNOWLEDGED'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            확인 필요 (
            {items.filter((it) => (!it.isAcknowledged || it.isRevised) && it.status !== 'PROVISIONAL').length}
            )
          </button>
          <button
            type="button"
            aria-pressed={filterTab === 'ACKNOWLEDGED'}
            onClick={() => setFilterTab('ACKNOWLEDGED')}
            className={`focus-ring min-h-11 flex-1 rounded-lg px-1 transition-colors cursor-pointer ${
              filterTab === 'ACKNOWLEDGED'
                ? 'bg-white text-blue-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            확인 완료 ({items.filter((it) => it.isAcknowledged && !it.isRevised).length})
          </button>
        </div>

        {/* 목록 */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-[13px] space-y-3">
              <p>아직 이 목록에 챌린지가 없어요.</p>
              {onSeedSamples && (
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
                  className="px-3.5 py-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-[13px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  {isSeeding ? '데이터 생성 중...' : '🧪 테스트용 종료 데이터 넣기 (4건)'}
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
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

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-[13px] text-slate-500">
                    <span className="tabular-nums">
                      {item.startDate} ~ {item.endDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700">
                        {item.completedCount} / {item.targetCount}회
                        {item.achievementRate != null && ` (${Math.round(item.achievementRate)}%)`}
                      </span>
                      {item.coinRewardCount > 0 && (
                        <span className="text-amber-600 font-semibold inline-flex items-center gap-0.5">
                          <Coins className="w-3.5 h-3.5" />
                          {item.coinRewardCount}C
                        </span>
                      )}
                    </div>
                  </div>
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
