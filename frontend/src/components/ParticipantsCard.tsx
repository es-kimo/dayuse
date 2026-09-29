import React from 'react';
import type { ChallengeDetail, ChallengeCalendarResponse, ParticipantCalendarItem, CalendarDailyRecordItem } from '../types';
import { Card } from './dayu/ui';
import { DayuAvatar } from './dayu/DayuAvatar';
import { DAYU_COLORS, type DayuColor, DAYU_COLOR_IDS } from './dayu/dayuColors';
import { Users, Check } from 'lucide-react';
import { getTodayKstString } from '../utils/date';

interface ParticipantsCardProps {
  challenge: ChallengeDetail;
  calendarData: ChallengeCalendarResponse | null;
  currentUserId?: number;
  totalDurationDays: number;
}

function resolveDayuColor(color?: string | null, fallbackIndex: number = 0): DayuColor {
  if (color && color in DAYU_COLORS) {
    return color as DayuColor;
  }
  return DAYU_COLOR_IDS[fallbackIndex % DAYU_COLOR_IDS.length];
}

export const ParticipantsCard: React.FC<ParticipantsCardProps> = ({
  challenge,
  calendarData,
  currentUserId,
  totalDurationDays,
}) => {
  const todayStr = getTodayKstString();

  // 참여자 목록 조합 (calendarData.participants 우선, fallback으로 challenge.participants)
  const participants = React.useMemo(() => {
    if (calendarData?.participants && calendarData.participants.length > 0) {
      return calendarData.participants.map((p: ParticipantCalendarItem, idx: number) => {
        const isMe = currentUserId ? p.userId === currentUserId : idx === 0;
        const chPart = challenge.participants?.find((cp) => cp.userId === p.userId);

        const doneRecords = p.records?.filter((r: CalendarDailyRecordItem) => r.status === 'COMPLETED') || [];
        const doneToday = p.records?.some(
          (r: CalendarDailyRecordItem) => r.date === todayStr && r.status === 'COMPLETED'
        ) || false;

        const effectiveTotalDays = Math.max(1, totalDurationDays);
        const rate = Math.min(100, Math.round((doneRecords.length / effectiveTotalDays) * 100));

        const penaltyTotal = chPart?.penaltyAmount ?? challenge.myPenaltyAmount ?? 0;

        return {
          userId: p.userId,
          nickname: p.nickname,
          dayuColor: resolveDayuColor((chPart as any)?.dayuColor || (p as any)?.dayuColor, idx),
          rate,
          penaltyTotal,
          doneToday,
          isMe,
        };
      });
    }

    // fallback: challenge.participants
    return (challenge.participants || []).map((p, idx) => {
      const isMe = currentUserId ? p.userId === currentUserId : idx === 0;
      return {
        userId: p.userId,
        nickname: p.nickname,
        dayuColor: resolveDayuColor((p as any).dayuColor, idx),
        rate: 100,
        penaltyTotal: p.penaltyAmount ?? 0,
        doneToday: false,
        isMe,
      };
    });
  }, [calendarData, challenge.participants, challenge.myPenaltyAmount, currentUserId, todayStr, totalDurationDays]);

  const totalCount = participants.length;
  const certifiedTodayCount = participants.filter((p) => p.doneToday).length;

  return (
    <Card className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-1">
        <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold text-slate-900 tracking-[-0.01em]">
          <Users className="w-4 h-4 text-slate-800 shrink-0" />
          함께하는 {totalCount}명
        </h3>
        <span className="text-[12.5px] text-slate-500 tabular-nums">
          오늘 {certifiedTodayCount}명 인증
        </span>
      </div>

      {/* Participants List */}
      <div className="flex flex-col">
        {participants.map((p, idx) => {
          const isPrevMe = idx > 0 && participants[idx - 1].isMe;
          const isMe = p.isMe;

          return (
            <div
              key={p.userId}
              className={`flex items-center gap-3 py-3 transition-colors ${
                isMe
                  ? 'bg-blue-50/70 -mx-2 px-2.5 rounded-[14px] border border-blue-100 my-0.5'
                  : idx === 0 || isPrevMe
                  ? 'border-t-0'
                  : 'border-t border-slate-100'
              }`}
            >
              {/* Dayu Avatar */}
              <DayuAvatar color={p.dayuColor} face="default" size={36} />

              {/* Center Info: Name & Progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14.5px] font-bold text-slate-800 truncate">
                    {p.nickname}
                  </span>
                  {isMe && (
                    <span className="text-[12px] text-slate-400 font-medium">나</span>
                  )}
                  {p.doneToday && (
                    <span className="inline-flex items-center gap-0.5 h-5 px-1.5 rounded-[5px] bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      오늘
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <i
                      className={`block h-full rounded-full transition-all duration-500 ${
                        p.rate < 75 ? 'bg-amber-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${p.rate}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-slate-600 tabular-nums w-[34px] text-right">
                    {p.rate}%
                  </span>
                </div>
              </div>

              {/* Right: Fine / Penalty */}
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-400 block">벌금</span>
                <b className="text-[14px] font-extrabold text-slate-800 tabular-nums">
                  {p.penaltyTotal.toLocaleString()}원
                </b>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
