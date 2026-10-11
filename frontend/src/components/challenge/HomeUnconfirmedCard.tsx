import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';

export interface HomeUnconfirmedCardProps {
  unacknowledgedCount: number;
  onClick: () => void;
}

/**
 * 홈 화면에 표시되는 단일 미확인 종료 결과 요약 카드 (F02, 5.5)
 * - 미확인 건수가 0이면 렌더링되지 않음
 * - 다중 팝업 연쇄 노출을 방지하고 사용자가 피로감 없이 직접 결과를 확인할 수 있도록 유도
 */
export const HomeUnconfirmedCard: React.FC<HomeUnconfirmedCardProps> = ({
  unacknowledgedCount,
  onClick,
}) => {
  if (unacknowledgedCount <= 0) {
    return null;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="w-full text-left bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200/90 rounded-2xl p-4 shadow-xs transition-all active:scale-[0.99] hover:shadow-md cursor-pointer"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
            <Trophy className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-gray-900 tracking-tight">
                종료된 챌린지 결과 확인
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                {unacknowledgedCount}건
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-0.5">
              도전 결과를 살펴보고 코인 보상을 확인하세요
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
      </div>
    </div>
  );
};
