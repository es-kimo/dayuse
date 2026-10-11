import React, { useState, useMemo } from 'react';
import { X, Trophy, CheckCircle2, Coins, Clock } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-gray-900">종료된 챌린지 결과</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 필터 (F04: 진행 중/종료/확인완료 상태별 탭 및 필터링) */}
        <div className="flex border-b border-gray-100 px-4 bg-gray-50/60 text-xs font-semibold">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              filterTab === 'ALL'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 ({items.length})
          </button>
          <button
            onClick={() => setFilterTab('UNACKNOWLEDGED')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              filterTab === 'UNACKNOWLEDGED'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            확인 필요 (
            {items.filter((it) => (!it.isAcknowledged || it.isRevised) && it.status !== 'PROVISIONAL').length}
            )
          </button>
          <button
            onClick={() => setFilterTab('ACKNOWLEDGED')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer ${
              filterTab === 'ACKNOWLEDGED'
                ? 'border-emerald-600 text-emerald-700 font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            확인 완료 ({items.filter((it) => it.isAcknowledged && !it.isRevised).length})
          </button>
        </div>

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-xs space-y-3">
              <p>해당하는 챌린지가 없습니다.</p>
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
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  {isSeeding ? '데이터 생성 중...' : '🧪 테스트용 종료 데이터 넣기 (4건)'}
                </button>
              )}
            </div>
          ) : (
            filteredItems.map((item) => {
              const isUnack = (!item.isAcknowledged || item.isRevised) && item.status !== 'PROVISIONAL';

              return (
                <div
                  key={item.challengeId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectChallenge(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectChallenge(item);
                    }
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isUnack
                      ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 shadow-2xs'
                      : 'border-gray-100 bg-white hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {item.groupName && (
                        <span className="text-[11px] font-medium text-gray-500 mb-0.5 block">
                          {item.groupName}
                        </span>
                      )}
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">
                        {item.challengeTitle}
                      </h4>
                    </div>

                    {/* 배지 */}
                    <div className="shrink-0 flex items-center gap-1">
                      {item.status === 'PROVISIONAL' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> 잠정 집계
                        </span>
                      ) : item.isRevised ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                          결과 수정됨
                        </span>
                      ) : item.isAcknowledged ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> 확인완료
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">
                          확인 필요
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs text-gray-500">
                    <span className="tabular-nums">
                      {item.startDate} ~ {item.endDate}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">
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
                </div>
              );
            })
          )}
        </div>

        {/* 푸터 보조 액션 */}
        {onSeedSamples && (
          <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">개발/테스트용 빠른 시드</span>
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
              className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
            >
              {isSeeding ? '데이터 생성 중...' : '+ 테스트용 종료 데이터 4건 추가'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
