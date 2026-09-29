import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DayuLogo } from './brand/DayuLogo';

interface PolicyLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  lastUpdated?: string;
}

const POLICY_TABS = [
  { label: '서비스 안내', path: '/guide' },
  { label: '이용약관', path: '/terms' },
  { label: '개인정보처리방침', path: '/privacy' },
  { label: '문의하기', path: '/contact' },
];

export const PolicyLayout: React.FC<PolicyLayoutProps> = ({
  children,
  title,
  description,
  lastUpdated,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/about');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50 text-slate-800 antialiased font-sans">
      {/* 상단 고정 헤더 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="이전 페이지로 이동"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Link to="/about" className="flex items-center gap-2" aria-label="dayuse 홈으로 이동">
              <DayuLogo variant="horizontal" theme="light" className="h-6 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/groups"
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              내 모임으로
            </Link>
            <Link
              to="/about"
              className="text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg transition shadow-xs"
            >
              소개 보기
            </Link>
          </div>
        </div>

        {/* 정책 문서 탭 내비게이션 */}
        <nav className="border-t border-slate-100 bg-white overflow-x-auto no-scrollbar" aria-label="정책 및 안내 문서 목록">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-4 sm:gap-8">
            {POLICY_TABS.map((tab) => {
              const isActive = location.pathname === tab.path;
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`py-3 text-sm whitespace-nowrap border-b-2 transition font-medium ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* 본문 콘텐츠 영역 */}
      <main className="flex-1 py-8 sm:py-12 px-4 sm:px-6">
        <article className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-10 lg:p-12">
          {/* 헤더 타이틀 영역 */}
          <header className="border-b border-slate-200 pb-6 mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
              {title}
            </h1>
            {description && (
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed break-keep">
                {description}
              </p>
            )}
            {lastUpdated && (
              <p className="text-xs text-slate-400 mt-3">
                최종 시행일자: {lastUpdated}
              </p>
            )}
          </header>

          {/* 본문 섹션들 */}
          <div className="prose prose-slate max-w-none space-y-8 text-sm sm:text-base leading-relaxed text-slate-700 break-keep">
            {children}
          </div>
        </article>
      </main>

      {/* 바닥글 */}
      <footer className="border-t border-slate-200 bg-white pt-8 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-medium text-slate-600">dayuse · 목표는 각자, 꾸준함은 함께.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <Link to="/about" className="hover:text-slate-800 transition">서비스 소개</Link>
            <span>·</span>
            <Link to="/terms" className="hover:text-slate-800 transition">이용약관</Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-slate-800 transition">개인정보처리방침</Link>
            <span>·</span>
            <Link to="/contact" className="hover:text-slate-800 transition">문의하기</Link>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 mt-4">
          © {new Date().getFullYear()} dayuse Team. All rights reserved.
        </p>
      </footer>
    </div>
  );
};
