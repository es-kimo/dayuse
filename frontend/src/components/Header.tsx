import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DayuLogo } from './brand/DayuLogo';
import { Users, User as UserIcon, LogOut, CalendarCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-header bg-card/90 backdrop-blur-sm border-b border-line px-4 py-2.5 flex items-center justify-between">
      <Link
        to="/groups"
        className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md py-0.5"
        title="데이유즈 홈"
      >
        <DayuLogo variant="symbol" className="h-7 w-auto" />
      </Link>

      {isAuthenticated && user && (
        <div className="flex items-center gap-3">
          <Link
            to="/today"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5 transition"
          >
            <CalendarCheck className="w-4 h-4" />
            <span className="hidden sm:inline">오늘</span>
          </Link>
          <Link
            to="/groups"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5 transition"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">모임</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1 py-0.5 transition"
          >
            <UserIcon className="w-4 h-4" />
            <span>{user.nickname}</span>
          </Link>
          <button
            onClick={logout}
            title="로그아웃"
            className="text-ink-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger rounded p-1 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isAuthenticated && (
        <button
          onClick={() => navigate('/login')}
          className="text-xs px-3.5 py-1.5 rounded-full bg-primary text-white font-semibold hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition"
        >
          로그인
        </button>
      )}
    </header>
  );
};
