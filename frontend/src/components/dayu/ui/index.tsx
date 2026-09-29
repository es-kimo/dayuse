/**
 * B(신규) 화면 공용 UI 조각. 수치는 handoff/tokens.md와 handoff/screens/mock.css 기준이다.
 * 새 화면은 여기 있는 조각을 먼저 쓰고, 없으면 여기에 추가한다. 화면 파일에 임의 수치를 흩뿌리지 않는다.
 * 아이콘은 lucide-react.
 */
import type {
  ReactNode,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { CalendarCheck, Users, User } from "lucide-react";

export function Card({
  children,
  className = "",
  tone = "default",
  ...p
}: HTMLAttributes<HTMLDivElement> & { tone?: "default" | "done" | "hero" }) {
  const t = {
    default: "bg-white border-slate-200",
    done: "bg-[#FBFEFC] border-emerald-200",
    hero: "bg-blue-50 border-blue-100",
  }[tone];
  return (
    <div {...p} className={`rounded-[18px] border p-4 ${t} ${className}`}>
      {children}
    </div>
  );
}

type ChipTone = "blue" | "ok" | "warn" | "gray" | "host";
export function Chip({
  tone = "gray",
  children,
  className = "",
}: {
  tone?: ChipTone;
  children: ReactNode;
  className?: string;
}) {
  const t = {
    blue: "bg-blue-50 text-blue-600",
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    gray: "bg-slate-100 text-slate-500",
    host: "bg-yellow-100 text-yellow-800",
  }[tone];
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-[7px] px-2 text-xs font-bold ${t} ${className}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = "blue",
  track = "gray",
  className = "",
}: {
  value: number;
  tone?: "blue" | "ok" | "warn";
  /** 트랙(바탕) 색. 파란 면 위에 올릴 때는 "white". */
  track?: "gray" | "white";
  className?: string;
}) {
  const c = { blue: "bg-blue-600", ok: "bg-emerald-600", warn: "bg-amber-500" }[tone];
  const bg = { gray: "bg-slate-100", white: "bg-white" }[track];
  return (
    <div
      className={`h-2 overflow-hidden rounded ${bg} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i
        className={`block h-full rounded ${c} transition-[width] duration-500`}
        style={{ width: `${Math.min(1, value) * 100}%` }}
      />
    </div>
  );
}

type BtnVariant = "primary" | "ghost" | "line" | "dark" | "kakao";
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
    ghost: "bg-slate-100 text-slate-800 hover:bg-slate-200",
    line: "bg-white text-slate-800 border border-slate-200 hover:bg-slate-50",
    dark: "bg-slate-800 text-white hover:bg-slate-900",
    kakao: "bg-[#FEE500] text-[#191600] hover:bg-[#F5DC00]",
  }[variant];
  const s = {
    sm: "h-9 px-3 text-[13.5px] rounded-[10px]",
    md: "h-12 px-4 text-[15px] rounded-xl",
    lg: "h-[54px] px-4 text-base rounded-[14px]",
  }[size];
  return (
    <button
      {...p}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-bold transition-colors disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 ${v} ${s} ${className}`}
    />
  );
}

/** 섹션 제목 줄: 왼쪽 제목(+아이콘), 오른쪽 보조 텍스트 */
export function SectionHead({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-[-0.01em] text-slate-800">
        {icon}
        {title}
      </h3>
      {right && <span className="text-[12.5px] tabular-nums text-slate-500">{right}</span>}
    </div>
  );
}

/** 화면 제목(24/800)과 보조 문장(14/slate-500) */
export function ScreenTitle({
  children,
  sub,
  className = "",
}: {
  children: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h1 className="text-[24px] font-extrabold leading-[1.3] tracking-[-0.03em] text-slate-800">{children}</h1>
      {sub && <p className="mt-1 text-[14px] text-slate-500">{sub}</p>}
    </div>
  );
}

/** 보조 안내 문장 12.5px */
export function Help({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[12.5px] text-slate-500 ${className}`}>{children}</p>;
}

/** 카드 안 목록 한 줄의 제목(15.5/700)과 설명(13/slate-500) */
export function RowText({ title, desc, className = "" }: { title: ReactNode; desc?: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 flex-1 ${className}`}>
      <div className="truncate text-[15.5px] font-bold tracking-[-0.01em] text-slate-800">{title}</div>
      {desc && <div className="truncate text-[13px] text-slate-500">{desc}</div>}
    </div>
  );
}

/** 목록 줄 왼쪽의 사각 아이콘. md=44px(기본), sm=38px */
export function GroupIcon({
  children,
  tone = "blue",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  tone?: "blue" | "gray";
  size?: "sm" | "md";
  className?: string;
}) {
  const t = { blue: "bg-blue-50 text-blue-600", gray: "bg-slate-100 text-slate-600" }[tone];
  const s = { sm: "size-[38px] text-[14px]", md: "size-11 text-[17px]" }[size];
  return (
    <div
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-[14px] font-extrabold leading-none ${t} ${s} ${className}`}
    >
      {children}
    </div>
  );
}

/** 두세 개 중 하나를 고르는 가로 세그먼트 */
export function Segmented<T extends string>({ value, onChange, options, label, className = "" }: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: ReactNode }[];
  label: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`grid gap-1 rounded-xl bg-slate-100 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-[38px] cursor-pointer rounded-[9px] text-[14px] font-bold transition-colors ${
            value === o.value ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 회색 면에 담은 짧은 안내문 */
export function Notice({
  icon,
  children,
  className = "",
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-2.5 rounded-xl bg-slate-100 px-3 py-2.5 text-[13px] leading-[1.5] text-slate-600 ${className}`}
    >
      {icon && <span className="mt-px shrink-0 text-slate-400">{icon}</span>}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-300 bg-white text-[15.5px] text-slate-800 placeholder:text-slate-400 focus:border-blue-600 focus:ring-[3px] focus:ring-blue-100 focus:outline-none disabled:bg-slate-50";

/** 높이 50, 둥글기 12, 포커스 시 blue-600 선 + 3px blue-100 링 */
export function TextField({ className = "", ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`h-[50px] px-3.5 ${fieldClass} ${className}`} />;
}

export function TextAreaField({ className = "", ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...p} className={`min-h-[84px] resize-none px-3.5 py-3 leading-[1.5] ${fieldClass} ${className}`} />
  );
}

/** 화면 하단에 붙는 주요 동작 영역 */
export function FootBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex shrink-0 flex-col gap-2.5 border-t border-slate-200 bg-slate-50 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))] ${className}`}
    >
      {children}
    </div>
  );
}

/** 스크롤되는 본문. 화면 좌우 여백 16, 카드 사이 14 */
export function ScreenBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <main className={`flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto px-4 pt-1 pb-6 ${className}`}>
      {children}
    </main>
  );
}

/** 하단 탭 3개. 기존 상단 아이콘 4개(오늘/모임/내 정보/로그아웃)를 대체. 로그아웃은 내 정보 안으로 이동. */
export function AppTabBar({
  active,
  todayLeft = 0,
  onNavigate,
}: {
  active: "today" | "groups" | "me";
  todayLeft?: number;
  onNavigate: (to: "today" | "groups" | "me") => void;
}) {
  const items = [
    { key: "today", label: "오늘", Icon: CalendarCheck },
    { key: "groups", label: "모임", Icon: Users },
    { key: "me", label: "내 정보", Icon: User },
  ] as const;
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]"
    >
      {items.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onNavigate(key)}
          aria-current={active === key ? "page" : undefined}
          className={`relative flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold ${active === key ? "text-slate-800" : "text-slate-400"}`}
        >
          <Icon size={22} className={active === key ? "text-blue-600" : ""} />
          {label}
          {key === "today" && todayLeft > 0 && (
            <span className="absolute left-1/2 top-0.5 ml-2 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] leading-4 text-white">
              {todayLeft}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}
