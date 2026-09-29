import React from 'react';

interface BottomActionBarProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 모바일 화면 하단 고정 CTA 버튼 영역.
 * - 핸드오프 표준: max-w-[390px] mx-auto
 * - 패딩: p-[12px_16px_16px] 및 safe-area-inset-bottom 대응
 * - 배경: #F8FAFC/95 블러 + 상단 1px slate-200 경계선
 */
export const BottomActionBar: React.FC<BottomActionBarProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto p-[12px_16px_calc(16px+env(safe-area-inset-bottom,0px))] bg-[#F8FAFC]/95 backdrop-blur-md border-t border-slate-200 z-30 ${className}`}
    >
      {children}
    </div>
  );
};
