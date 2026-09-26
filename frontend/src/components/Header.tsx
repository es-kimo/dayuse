import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DayuLogo } from './brand/DayuLogo';
import { Users, User as UserIcon, LogOut, CalendarCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header role="banner" className="sticky top-0 z-header bg-card/90 backdrop-blur-xs border-b border-line px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] flex items-center justify-between">
      <Link
        to="/groups"
        className="flex items-center focus-ring rounded-md py-0.5"
        aria-label="데이유즈 홈으로 이동"
      >
        <DayuLogo variant="symbol" className="h-7 w-auto" />
      </Link>

      {isAuthenticated && user && (
        <nav aria-label="주요 서비스 탐색" className="flex items-center gap-3">
          <Link
            to="/today"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-ring rounded px-1.5 py-1 min-h-[36px] transition"
          >
            <CalendarCheck className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">오늘</span>
          </Link>
          <Link
            to="/groups"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-ring rounded px-1.5 py-1 min-h-[36px] transition"
          >
            <Users className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">모임</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-ring rounded px-1.5 py-1 min-h-[36px] transition"
          >
            <UserIcon className="w-4 h-4" aria-hidden="true" />
            <span>{user.nickname}</span>
          </Link>
          <button
            type="button"
            onClick={logout}
            aria-label="로그아웃"
            className="text-ink-muted hover:text-danger focus-ring rounded p-1.5 min-w-[36px] min-h-[36px] inline-flex items-center justify-center transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </nav>
      )}

      {!isAuthenticated && (
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-xs px-3.5 py-1.5 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active focus-ring transition cursor-pointer"
        >
          로그인
        </button>
      )}
    </header>
  );
};
