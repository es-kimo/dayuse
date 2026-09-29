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
      className={`w-full max-w-[390px] mx-auto min-h-screen bg-slate-50 text-slate-800 flex flex-col relative font-sans antialiased text-[15px] leading-relaxed ${className}`}
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

export function ScreenNav({ active, pending = 0 }: { active: "today" | "groups" | "me"; pending?: number }) {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-40 grid grid-cols-3 border-t border-slate-200 bg-white/95 backdrop-blur-md px-2 py-1 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      aria-label="주요 메뉴"
    >
      <button
        onClick={() => navigate("/today")}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer relative ${
          active === "today" ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
        }`}
        aria-current={active === "today" ? "page" : undefined}
      >
        <CalendarCheck className="w-[22px] h-[22px]" />
        <span>오늘</span>
        {pending > 0 && (
          <span className="absolute top-1 right-[calc(50%-18px)] px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white leading-tight">
            {pending}
          </span>
        )}
      </button>
      <button
        onClick={() => navigate("/groups")}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
          active === "groups" ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
        }`}
        aria-current={active === "groups" ? "page" : undefined}
      >
        <Users className="w-[22px] h-[22px]" />
        <span>모임</span>
      </button>
      <button
        onClick={() => navigate("/profile")}
        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
          active === "me" ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
        }`}
        aria-current={active === "me" ? "page" : undefined}
      >
        <UserRound className="w-[22px] h-[22px]" />
        <span>내 정보</span>
      </button>
    </nav>
  );
}
