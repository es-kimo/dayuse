import React from 'react';

interface AppMainHeaderProps {
  title?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * 3개 메인 루트 탭(오늘, 모임, 내 정보)의 상단 헤더.
 * - 핸드오프 표준: h-14 (56px), px-4, bg-[#F8FAFC]/95 backdrop-blur-md
 * - 화면 제목 (22px 800) 또는 로고 + 우측 알림/만들기 버튼 등
 */
export const AppMainHeader: React.FC<AppMainHeaderProps> = ({
  title,
  leftAction,
  rightAction,
  className = '',
}) => {
  return (
    <header
      className={`sticky top-0 z-20 flex items-center justify-between px-4 h-14 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-transparent ${className}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {leftAction}
        {typeof title === 'string' ? (
          <h1 className="text-[22px] font-extrabold text-slate-900 tracking-[-0.03em] truncate">
            {title}
          </h1>
        ) : (
          title
        )}
      </div>

      {rightAction && (
        <div className="flex items-center gap-1 shrink-0">
          {rightAction}
        </div>
      )}
    </header>
  );
};
