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
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex w-full cursor-pointer items-center gap-3 rounded-[18px] border border-blue-100 bg-blue-50 p-4 text-left transition-colors hover:bg-blue-100"
    >
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-white text-blue-600">
        <Trophy className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold tracking-[-0.01em] text-slate-800">
          확인할 챌린지 결과 {unacknowledgedCount}건
        </span>
        <span className="mt-0.5 block text-[13px] text-slate-500">나의 도전과 받은 코인을 확인해요</span>
      </span>
      <ChevronRight aria-hidden="true" className="size-[22px] shrink-0 text-slate-400" />
    </button>
  );
};
