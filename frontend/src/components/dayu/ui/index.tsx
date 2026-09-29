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
import { CalendarCheck, User, Users, X } from "lucide-react";

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

type ChipTone = "blue" | "ok" | "warn" | "bad" | "gray" | "host";
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
    bad: "bg-red-50 text-red-700",
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

type BtnVariant = "primary" | "ghost" | "line" | "dark" | "danger" | "kakao";
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
    danger: "bg-red-600 text-white hover:bg-red-700",
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

/** 헤더 아래에 붙는 화면 안 탭(홈 · 챌린지 · 멤버). 밑줄로 현재 탭을 표시한다. */
export function PageTabs<T extends string>({ value, onChange, options, label, className = "" }: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={`sticky top-14 z-20 grid shrink-0 border-b border-slate-200 bg-slate-50/92 backdrop-blur-md ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-current={on ? "page" : undefined}
            onClick={() => onChange(o.value)}
            className={`h-11 cursor-pointer border-b-2 text-[14px] font-bold transition-colors ${
              on ? "border-slate-800 text-slate-800" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={`ml-1 text-[12px] tabular-nums ${on ? "text-blue-600" : "text-slate-400"}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** 바텀시트 맨 위의 손잡이 */
export function SheetGrab() {
  return <div aria-hidden className="mx-auto h-[5px] w-10 shrink-0 rounded-[3px] bg-slate-300" />;
}

/** 바텀시트 제목 줄: 제목(+설명)과 닫기 버튼 */
export function SheetHead({ title, desc, onClose, titleId }: {
  title: ReactNode;
  desc?: ReactNode;
  onClose: () => void;
  titleId?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <h3 id={titleId} className="text-[19px] font-extrabold text-slate-800">{title}</h3>
        {desc && <p className="text-[13px] text-slate-500">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="닫기"
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
      >
        <X className="size-[22px]" />
      </button>
    </div>
  );
}

/** 켜짐/꺼짐 토글. 52×30, 손잡이 24 */
export function Switch({ checked, onChange, label, disabled = false }: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[30px] w-[52px] shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-slate-300"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[22px]" : ""
        }`}
      />
    </button>
  );
}

/** 라벨 + 입력 한 묶음. 필수 표시와 (선택) 표시를 함께 다룬다. */
export function Field({ label, htmlFor, required = false, optional = false, help, children, className = "" }: {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-[14px] leading-[21px] font-bold text-slate-800">
        {label}
        {required && <span className="text-red-700"> *</span>}
        {optional && <span className="font-normal text-slate-500"> (선택)</span>}
      </label>
      {children}
      {help && <Help>{help}</Help>}
    </div>
  );
}

/** 설명이 붙은 큰 선택지 카드(각자하기 / 함께하기 등) */
export function ChoiceCard({ active = false, title, desc, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  title: ReactNode;
  desc?: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...p}
      className={`flex flex-1 cursor-pointer flex-col items-start gap-1 rounded-[14px] border-[1.5px] px-[13.5px] py-[13.5px] text-left transition-colors ${
        active ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"
      } ${className}`}
    >
      <b className={`text-[14.5px] font-bold ${active ? "text-blue-600" : "text-slate-800"}`}>{title}</b>
      {desc && <span className="text-[12px] leading-[1.45] text-slate-500">{desc}</span>}
    </button>
  );
}

/** 3단계 진행 막대 */
export function StepBar({ step, total = 3, className = "" }: { step: number; total?: number; className?: string }) {
  return (
    <div className={`flex gap-1.5 ${className}`} role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={`h-1 flex-1 rounded-sm ${i < step ? "bg-blue-600" : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

/** 가로로 늘어놓는 필터 알약. 눌린 것만 파란 테두리를 쓴다. */
export function Pill({ active = false, className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...p}
      className={`h-[34px] shrink-0 cursor-pointer rounded-[10px] border px-3 text-[13.5px] font-semibold whitespace-nowrap transition-colors ${
        active ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      } ${className}`}
    />
  );
}

/** 겹쳐 놓은 프로필 목록. 넘치는 인원은 +N으로 접는다. */
export function AvatarStack({ children, extra = 0, className = "" }: { children: ReactNode; extra?: number; className?: string }) {
  return (
    <div className={`flex -space-x-2 ${className}`}>
      {children}
      {extra > 0 && (
        <div className="grid size-[30px] place-items-center rounded-full border-2 border-white bg-slate-400 text-[11px] font-extrabold text-white">
          +{extra}
        </div>
      )}
    </div>
  );
}

/** 회색 면에 담은 숫자 한 칸(쌓인 벌금 · 확인 대기 …) */
export function StatTile({ label, value, className = "" }: { label: ReactNode; value: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 flex-1 rounded-xl bg-slate-100 px-2.5 py-2.5 ${className}`}>
      <div className="truncate text-[11.5px] text-slate-500">{label}</div>
      <div className="truncate text-[15px] font-extrabold tabular-nums text-slate-800">{value}</div>
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
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]"
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
