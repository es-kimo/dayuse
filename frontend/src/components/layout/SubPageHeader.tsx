import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface SubPageHeaderProps {
  title?: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

/**
 * 모바일 서브 화면 상단 헤더 바.
 * - 핸드오프 표준: h-14 (56px), px-3, bg-[#F8FAFC]/95 backdrop-blur-md
 * - 뒤로가기 버튼(w-10 h-10 rounded-xl) + 타이틀(text-[17px] font-extrabold) + 우측 액션
 */
export const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  title,
  onBack,
  rightAction,
  className = '',
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header
      className={`sticky top-0 z-20 flex items-center justify-between px-3 h-14 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-transparent ${className}`}
    >
      <div className="flex items-center gap-1 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="뒤로"
          className="w-10 h-10 rounded-xl grid place-items-center text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        {typeof title === 'string' ? (
          <h1 className="text-[17px] font-extrabold text-slate-900 tracking-[-0.02em] truncate">
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
