/**
 * 공용 UI 조각. 이미 프로젝트에 같은 역할의 컴포넌트가 있으면 그걸 쓰고, 이 파일은 스타일 기준으로만 참고한다.
 * 아이콘은 lucide-react.
 */
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { CalendarCheck, Users, User } from "lucide-react";

export function Card({ children, className = "", tone = "default" }: {
  children: ReactNode; className?: string; tone?: "default" | "done" | "hero";
}) {
  const t = { default: "bg-white border-slate-200", done: "bg-[#FBFEFC] border-emerald-200", hero: "bg-blue-50 border-blue-100" }[tone];
  return <div className={`rounded-[18px] border p-4 ${t} ${className}`}>{children}</div>;
}

type ChipTone = "blue" | "ok" | "warn" | "gray" | "host";
export function Chip({ tone = "gray", children, className = "" }: { tone?: ChipTone; children: ReactNode; className?: string }) {
  const t = {
    blue: "bg-blue-50 text-blue-600", ok: "bg-emerald-50 text-emerald-700", warn: "bg-amber-50 text-amber-700",
    gray: "bg-slate-100 text-slate-500", host: "bg-yellow-100 text-yellow-800",
  }[tone];
  return <span className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[7px] px-2 text-xs font-bold ${t} ${className}`}>{children}</span>;
}

export function ProgressBar({ value, tone = "blue", className = "" }: { value: number; tone?: "blue" | "ok" | "warn"; className?: string }) {
  const c = { blue: "bg-blue-600", ok: "bg-emerald-600", warn: "bg-amber-500" }[tone];
  return (
    <div className={`h-2 overflow-hidden rounded bg-slate-100 ${className}`} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <i className={`block h-full rounded ${c} transition-[width] duration-500`} style={{ width: `${Math.min(1, value) * 100}%` }} />
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "line" | "dark" | "kakao";
export function Button({ variant = "primary", size = "md", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800", ghost: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    line: "bg-white text-slate-800 border border-slate-200", dark: "bg-slate-800 text-white", kakao: "bg-[#FEE500] text-[#191600]",
  }[variant];
  const s = { sm: "h-9 px-3 text-[13.5px] rounded-[10px]", md: "h-12 px-4 text-[15px] rounded-xl", lg: "h-[54px] px-4 text-base rounded-[14px]" }[size];
  return <button {...p} className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-bold disabled:bg-slate-200 disabled:text-slate-400 ${v} ${s} ${className}`} />;
}

/** 섹션 제목 줄: 왼쪽 제목(+아이콘), 오른쪽 보조 텍스트 */
export function SectionHead({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold">{icon}{title}</h3>
      {right && <span className="text-[12.5px] text-slate-500 tabular-nums">{right}</span>}
    </div>
  );
}

/** 하단 탭 3개. 기존 상단 아이콘 4개(오늘/모임/내 정보/로그아웃)를 대체. 로그아웃은 내 정보 안으로 이동. */
export function AppTabBar({ active, todayLeft = 0, onNavigate }: {
  active: "today" | "groups" | "me"; todayLeft?: number; onNavigate: (to: "today" | "groups" | "me") => void;
}) {
  const items = [
    { key: "today", label: "오늘", Icon: CalendarCheck },
    { key: "groups", label: "모임", Icon: Users },
    { key: "me", label: "내 정보", Icon: User },
  ] as const;
  return (
    <nav aria-label="주요 메뉴" className="grid grid-cols-3 border-t border-slate-200 bg-white px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]">
      {items.map(({ key, label, Icon }) => (
        <button key={key} onClick={() => onNavigate(key)} aria-current={active === key ? "page" : undefined}
          className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold ${active === key ? "text-slate-800" : "text-slate-400"}`}>
          <Icon size={22} className={active === key ? "text-blue-600" : ""} />
          {label}
          {key === "today" && todayLeft > 0 && (
            <span className="absolute left-1/2 top-0.5 ml-2 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] leading-4 text-white">{todayLeft}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
