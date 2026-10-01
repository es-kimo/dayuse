import React from 'react';
import { Ticket } from 'lucide-react';
import { Button, Card, Chip, Help } from './dayu/ui';
import { useRedayDeadlineTimer } from '../hooks/useRedayDeadlineTimer';
import { formatMonthDay } from '../utils/date';
import { formatRedayRemaining } from '../utils/reday';

/**
 * 리데이 사용 안내 카드 (v0.11 F11)
 *
 * "지금 리데이를 쓸 수 있는 내 기록"만 따로 끌어올린다.
 * 월 단위 달력(StreakCalendar)은 이번 달만 그리므로, 지난달 대상일의 지각 기록은
 * 달력 안에서는 보이지 않는다. 기한이 걸린 동작을 그런 칸에 숨기면 기한이 그냥 지나간다.
 *
 * 모임 홈과 챌린지 상세가 같은 카드를 쓴다. 두 화면의 원본 데이터 모양이 다르므로
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
  const remainingSeconds = useRedayDeadlineTimer(item.redayDeadline);

  // 열어둔 화면에서 기한이 끝나면 그 줄은 사라진다.
  if (remainingSeconds <= 0) return null;

  return (
    <div className="flex items-center justify-between gap-2.5 rounded-xl bg-white px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[14.5px] font-bold tracking-[-0.01em] text-slate-800">
            {formatMonthDay(item.targetDate)}
          </span>
          <Chip tone="warn">벌금 보류 · {item.penaltyAmount.toLocaleString()}원</Chip>
        </div>
        {item.challengeTitle && (
          <div className="mt-0.5 truncate text-[13px] text-slate-600">{item.challengeTitle}</div>
        )}
        <div className="mt-0.5 text-[12.5px] tabular-nums text-slate-500">
          {formatRedayRemaining(remainingSeconds)}
        </div>
      </div>
      <Button size="sm" className="shrink-0" onClick={() => onStartReday(item)}>
        <Ticket className="size-3.5" />
        리데이
      </Button>
    </div>
  );
};

export const RedayActionCard: React.FC<RedayActionCardProps> = ({ items, onStartReday }) => {
  if (items.length === 0) return null;

  return (
    <Card tone="hero" className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-blue-600">
          <Ticket className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-extrabold tracking-[-0.01em] text-slate-800">
            리데이 티켓으로 벌금 면제하기
          </div>
          <p className="mt-0.5 text-[13px] leading-[1.5] text-slate-600">
            기한 안에 리데이 티켓 1장을 사용하면 이번 벌금이 면제돼요. 지각 기록은 그대로 남아요.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <RedayActionRow key={item.recordId} item={item} onStartReday={onStartReday} />
        ))}
      </div>

      <Help>보유한 티켓이 없으면 짧은 안내를 보고 1장을 받을 수 있어요.</Help>
    </Card>
  );
};
