import { ChevronRight, HelpCircle } from "./ScreenIcons";

/**
 * 모임 홈에서 "확인 안 된 지난 기록"을 알려 주는 카드.
 * 건수가 0이면 아무것도 그리지 않는다.
 */
export function UncheckedRecordsCard({ count, onOpen }: { count: number; onOpen: () => void }) {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-3 rounded-[18px] border border-amber-200 bg-[#FFFDF5] p-4 text-left transition-colors hover:bg-amber-50"
    >
      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-amber-50 text-amber-700">
        <HelpCircle className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14.5px] font-bold tracking-[-0.01em] text-slate-800">
          확인 안 된 지난 기록 {count}건
        </span>
        <span className="block text-[13px] text-slate-500">올리거나 못 했다고 정리해 주세요</span>
      </span>
      <ChevronRight className="size-[22px] shrink-0 text-slate-400" />
    </button>
  );
}
