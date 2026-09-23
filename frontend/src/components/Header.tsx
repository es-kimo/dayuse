import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, User as UserIcon, LogOut } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-header bg-white/90 backdrop-blur-sm border-b border-slate-200 px-4 py-3 flex items-center justify-between">
      <Link to="/groups" className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        dayuse
      </Link>

      {isAuthenticated && user && (
        <div className="flex items-center gap-3">
          <Link
            to="/groups"
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 transition"
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">모임</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-blue-600 transition"
          >
            <UserIcon className="w-4 h-4" />
            <span>{user.nickname}</span>
          </Link>
          <button
            onClick={logout}
            title="로그아웃"
            className="text-slate-400 hover:text-red-500 transition p-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {!isAuthenticated && (
        <button
          onClick={() => navigate('/login')}
          className="text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          로그인
        </button>
      )}
    </header>
  );
};
