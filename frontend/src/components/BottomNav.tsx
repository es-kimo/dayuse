import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BottomNavProps {
  todayBadgeCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ todayBadgeCount = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isToday = location.pathname.startsWith('/today');
  const isGroups = location.pathname.startsWith('/groups');
  const isProfile = location.pathname.startsWith('/profile');

  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky bottom-0 z-header w-full border-t border-slate-200 bg-white/95 backdrop-blur-xs grid grid-cols-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
    >
      <button
        type="button"
        onClick={() => navigate('/today')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer relative ${
          isToday ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-current={isToday ? 'page' : undefined}
      >
        <div className="relative">
          <svg className="w-5 h-5 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m9 16 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {todayBadgeCount > 0 && (
            <span
              className="absolute -top-1 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center border border-white"
              aria-label={`인증할 챌린지 ${todayBadgeCount}개`}
            >
              {todayBadgeCount}
            </span>
          )}
        </div>
        <span>오늘</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/groups')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
          isGroups ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-current={isGroups ? 'page' : undefined}
      >
        <svg className="w-5 h-5 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>모임</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/profile')}
        className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-semibold transition active:scale-95 cursor-pointer ${
          isProfile ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
        }`}
        aria-current={isProfile ? 'page' : undefined}
      >
        <svg className="w-5 h-5 fill-none stroke-currentColor stroke-2" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>내 정보</span>
      </button>
    </nav>
  );
};
