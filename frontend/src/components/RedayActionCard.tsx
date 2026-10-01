import React from 'react';
import { ChevronRight, Ticket } from 'lucide-react';
import { Card } from './dayu/ui';
import { useRedayDeadlineTimer } from '../hooks/useRedayDeadlineTimer';
import { formatMonthDay } from '../utils/date';
import { calculateRemainingSeconds, formatRedayRemaining } from '../utils/reday';

/**
 * 리데이 사용 안내 카드 (v0.11 F11)
 *
 * "지금 리데이를 쓸 수 있는 내 기록"만 따로 끌어올린다.
 * 여러 챌린지가 섞이는 모임 홈에서 사용한다. 상세 화면은 내 기록 달력에서 진입한다.
 * 호출부가 [RedayActionItem]으로 정규화해서 넘긴다.
 */

export interface RedayActionItem {
  /** 리데이를 적용할 일일 기록 ID */
  recordId: number;
  /** 대상 날짜 (YYYY-MM-DD) */
  targetDate: string;
  /** 면제될 보류 벌금 */
  penaltyAmount: number;
  /** 서버가 준 리데이 기한. 오프셋 없는 KST LocalDateTime 문자열 */
  redayDeadline?: string | null;
  /** 모임 홈처럼 여러 챌린지가 섞이는 화면에서만 채운다 */
  challengeTitle?: string;
}

interface RedayActionCardProps {
  items: RedayActionItem[];
  onStartReday: (item: RedayActionItem) => void;
}

const RedayActionRow: React.FC<{
  item: RedayActionItem;
  onStartReday: (item: RedayActionItem) => void;
}> = ({ item, onStartReday }) => {
  const remainingSeconds = calculateRemainingSeconds(item.redayDeadline);

  // 열어둔 화면에서 기한이 끝나면 그 줄은 사라진다.
  if (remainingSeconds <= 0) return null;

  return (
    <button
      type="button"
      aria-label={`${item.challengeTitle || '챌린지'} ${formatMonthDay(item.targetDate)}, 보류 벌금 ${item.penaltyAmount.toLocaleString()}원 리데이로 면제받기`}
      className="flex w-full items-center gap-2.5 rounded-[10px] py-3 text-left transition-colors first:pt-0 last:pb-0 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
      onClick={() => {
        if (calculateRemainingSeconds(item.redayDeadline) > 0) onStartReday(item);
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-bold text-slate-800">{item.challengeTitle || '챌린지'}</p>
        <p className="mt-1 text-[12px] tabular-nums text-slate-500">
          {formatMonthDay(item.targetDate)} · {formatRedayRemaining(remainingSeconds)}
        </p>
      </div>
      <div className="shrink-0 text-right text-blue-600">
        <p className="text-[14.5px] font-bold tabular-nums">{item.penaltyAmount.toLocaleString()}원</p>
        <p className="mt-1 text-[12px] font-medium">면제받기</p>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
    </button>
  );
};

export const RedayActionCard: React.FC<RedayActionCardProps> = ({ items, onStartReday }) => {
  // 마지막 기한까지 부모도 갱신해 빈 카드와 만료된 건수가 남지 않게 한다.
  const lastDeadline = items.map((item) => item.redayDeadline)
    .filter((value): value is string => !!value).sort().at(-1);
  useRedayDeadlineTimer(lastDeadline);
  const availableItems = items.filter((item) => calculateRemainingSeconds(item.redayDeadline) > 0)
    .sort((a, b) => calculateRemainingSeconds(a.redayDeadline) - calculateRemainingSeconds(b.redayDeadline));
  if (availableItems.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3.5">
      <h3 className="flex items-center gap-1.5 text-[14px] font-bold text-slate-800">
        <Ticket aria-hidden="true" className="size-4 text-blue-600" />
        리데이 <span className="text-blue-600">{availableItems.length}</span>
      </h3>
      <div className="flex flex-col divide-y divide-slate-100">
        {availableItems.map((item) => (
          <RedayActionRow key={item.recordId} item={item} onStartReday={onStartReday} />
        ))}
      </div>
    </Card>
  );
};
