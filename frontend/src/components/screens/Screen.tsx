import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, Users, UserRound } from "./ScreenIcons";
import { parseDayuColor, isHttpProfileImage } from "../../tokens/dayuColors";
import { screenAvatarPath } from "./screenAvatarPath";

export const screenAssets = {
  logo: "/screens/edf2d55e7adf.svg",
  symbol: "/screens/73ea4daeed3e.svg",
  invite: "/screens/7fc9592c1e11.svg",
  hero: "/screens/683d1cd6b03a.svg",
};

export function Screen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mx-auto min-h-dvh w-full max-w-app bg-slate-50 text-slate-800 flex flex-col relative font-sans antialiased text-[15px] leading-relaxed ${className}`}
    >
      {children}
    </div>
  );
}

export function ScreenAvatar({
  image,
  dim = false,
  className = "",
  children,
}: {
  image?: string | null;
  dim?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const color = parseDayuColor(image);
  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden font-bold text-xs border border-white shadow-xs ${
        dim ? "opacity-35 grayscale" : ""
      } ${className}`}
      style={{ background: color.bg, color: color.color }}
    >
      {isHttpProfileImage(image) ? (
        <img src={image!} alt="" className="w-full h-full object-cover" />
      ) : (
        <svg viewBox="0 0 55.25 55.25" className="w-5 h-5" aria-hidden="true">
          <path fill="currentColor" fillRule="evenodd" transform="translate(-3 -3.25)" d={screenAvatarPath} />
        </svg>
      )}
      {children}
    </div>
  );
}

const NAV_ITEMS = [
  { key: "today", label: "오늘", to: "/today", Icon: CalendarCheck },
  { key: "groups", label: "모임", to: "/groups", Icon: Users },
  { key: "me", label: "내 정보", to: "/profile", Icon: UserRound },
] as const;

export function ScreenNav({ active, pending = 0 }: { active: "today" | "groups" | "me"; pending?: number }) {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-app -translate-x-1/2 grid-cols-3 border-t border-slate-200 bg-white px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom,0px))]"
      aria-label="주요 메뉴"
    >
      {NAV_ITEMS.map(({ key, label, to, Icon }) => {
        const on = active === key;
        return (
          <button
            key={key}
            onClick={() => navigate(to)}
            aria-current={on ? "page" : undefined}
            className={`relative flex cursor-pointer flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold transition-colors ${
              on ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className={`size-[22px] ${on ? "text-blue-600" : ""}`} />
            <span>{label}</span>
            {key === "today" && pending > 0 && (
              <span className="absolute top-1 left-1/2 grid h-4 min-w-4 place-items-center rounded-lg bg-blue-600 px-1 text-[10px] leading-4 font-bold text-white">
                {pending}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
