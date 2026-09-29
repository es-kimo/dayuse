import React from 'react';

interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 모바일 화면 하단 고정 CTA 버튼 영역.
 * - 앱 공통 너비: max-w-app mx-auto
 * - 패딩: p-[12px_16px_16px] 및 safe-area-inset-bottom 대응
 * - 배경: #F8FAFC/95 블러 + 상단 1px slate-200 경계선
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`fixed right-0 bottom-0 left-0 z-30 mx-auto max-w-app border-t border-slate-200 bg-slate-50/95 px-4 pt-[13px] pb-[calc(16px+env(safe-area-inset-bottom,0px))] backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
};
