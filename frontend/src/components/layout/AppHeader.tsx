import React from 'react';
import { ArrowLeft } from 'lucide-react';

export interface AppHeaderProps {
  /**
   * 'main': 메인 3대 탭(오늘, 모임, 내 정보). 22px 굵은 타이틀.
   * 'sub': 서브 상세/생성/설정 페이지. 17px 볼드 + 뒤로가기 버튼.
   */
  variant?: 'main' | 'sub';
  /** 헤더 타이틀 */
  title: React.ReactNode;
  /** 좌측 커스텀 슬롯 (예: 데이유 심볼 로고 등). variant='sub'에서 미지정 시 뒤로가기 버튼 표시 */
  leftAction?: React.ReactNode;
  /** 우측 액션 슬롯 (예: 알림 벨, +만들기, 친구 초대, 메뉴 등) */
  rightAction?: React.ReactNode;
  /** variant='sub'일 때 뒤로가기 콜백 (미지정 시 window.history.back() 사용) */
  onBack?: () => void;
  /** 하단 경계선 표시 여부 (기본 true) */
  border?: boolean;
  className?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  variant = 'sub',
  title,
  leftAction,
  rightAction,
  onBack,
  border = true,
  className = '',
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <header
      role="banner"
      className={`bar sticky top-0 z-30 h-14 w-full flex items-center gap-1.5 px-3 bg-slate-50/92 backdrop-blur-md transition-colors ${
        border ? 'border-b border-slate-200' : 'border-b border-transparent'
      } ${className}`}
    >
      {/* 좌측 액션 / 뒤로가기 */}
      {leftAction ? (
        <div className="flex items-center shrink-0">{leftAction}</div>
      ) : variant === 'sub' ? (
        <button
          type="button"
          onClick={handleBack}
          className="ib w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition active:scale-95 shrink-0"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
        </button>
      ) : null}

      {/* 중앙 타이틀 */}
      <h1
        className={`t flex-1 min-w-0 font-extrabold tracking-tight truncate ${
          variant === 'main' ? 'text-[22px] text-slate-900 pl-1' : 'text-[17px] text-slate-900'
        }`}
      >
        {title}
      </h1>

      {/* 우측 액션 */}
      {rightAction && (
        <div className="flex items-center gap-1 shrink-0">{rightAction}</div>
      )}
    </header>
  );
};
