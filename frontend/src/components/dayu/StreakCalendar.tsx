export type DayStatus = "done" | "miss" | "wait" | "future" | "none";

/**
 * 한 달 기록 달력. 동그라미 + 같은 주에서 연속으로 인증한 날은 연파랑 띠로 잇는다.
 * - done: 파란 원(흰 숫자)  - miss: 빨간 점선 원(숫자 대신 가로줄)
 * - wait: 오늘 인증 대기(노란 원)  - future: 흐린 숫자  - none: 챌린지 기간 밖
 */
export function StreakCalendar({ year, month, statusOf, today }: {
  year: number; month: number;            // month: 1~12
  statusOf: (day: number) => DayStatus;
  today?: number;                          // 이번 달이면 오늘 날짜
}) {
  const first = new Date(year, month - 1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const isDone = (d: number) => d >= 1 && d <= days && statusOf(d) === "done";

  return (
    <div className="grid grid-cols-7 gap-y-2" role="grid" aria-label={`${month}월 기록`}>
      {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
        <div key={w} className="pb-1 text-center text-[11.5px] font-semibold text-slate-400">{w}</div>
      ))}
      {cells.map((d, i) => {
        if (d === null) return <div key={`b${i}`} />;
        const s = statusOf(d);
        const col = i % 7;
        const joinL = s === "done" && col > 0 && isDone(d - 1);
        const joinR = s === "done" && col < 6 && isDone(d + 1);
        const circle = {
          done: "bg-blue-600 text-white",
          miss: "border-[1.5px] border-dashed border-red-400",
          wait: "bg-amber-50 text-amber-700 border-[1.5px] border-amber-200",
          future: "text-slate-400 font-medium",
          none: "text-slate-300 font-medium",
        }[s];
        return (
          <div key={d} role="gridcell" aria-label={`${d}일 ${label(s)}`} className="relative grid h-10 place-items-center">
            {joinL && <span className="absolute inset-y-[3px] left-0 right-1/2 bg-blue-100" />}
            {joinR && <span className="absolute inset-y-[3px] left-1/2 right-0 bg-blue-100" />}
            <span className={`relative z-[1] grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold tabular-nums ${circle}
              ${d === today ? "shadow-[0_0_0_2px_#fff,0_0_0_4px_#1E293B]" : ""}`}>
              {s === "miss" ? <span className="h-[1.5px] w-2.5 rounded bg-red-400" /> : d}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const label = (s: DayStatus) => ({ done: "인증", miss: "놓침", wait: "인증 대기", future: "예정", none: "" }[s]);

/** 달력 아래 범례 */
export function StreakLegend() {
  return (
    <div className="flex gap-3 text-xs text-slate-500">
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />인증</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-[1.5px] border-red-400" />놓친 날</span>
      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-2 border-slate-800" />오늘</span>
    </div>
  );
}
