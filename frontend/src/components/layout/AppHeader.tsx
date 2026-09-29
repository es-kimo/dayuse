import React from "react";
import { ArrowLeft } from "lucide-react";

export interface AppHeaderProps {
  /**
   * 'main': 메인 3대 탭(오늘, 모임, 내 정보). 타이틀 22px.
   * 'sub': 서브 상세/생성/설정 페이지. 좌측에 뒤로가기 버튼이 기본으로 들어가고 타이틀 17px.
   */
  variant?: "main" | "sub";
  /**
   * 타이틀 크기를 variant 기본값과 다르게 쓸 때만 지정한다.
   * 예: 오늘 화면은 좌측에 심볼 로고가 들어가서 main이지만 17px를 쓴다.
   */
  titleSize?: "lg" | "md";
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
  variant = "sub",
  titleSize,
  title,
  leftAction,
  rightAction,
  onBack,
  className = "",
}) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    }
  };

  return (
    <header
      role="banner"
      className={`sticky top-0 z-30 mx-auto flex h-14 w-full max-w-app shrink-0 items-center gap-1.5 bg-slate-50/92 pr-2.5 pl-3 backdrop-blur-md ${className}`}
    >
      {/* 좌측 액션 / 뒤로가기 */}
      {leftAction ? (
        <div className="flex shrink-0 items-center">{leftAction}</div>
      ) : variant === "sub" ? (
        <button
          type="button"
          onClick={handleBack}
          className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="size-[22px]" aria-hidden="true" />
        </button>
      ) : null}

      {/* 중앙 타이틀 */}
      <h1
        className={`min-w-0 flex-1 truncate font-extrabold tracking-[-0.02em] text-slate-800 ${
          (titleSize ?? (variant === "main" ? "lg" : "md")) === "lg" ? "pl-1 text-[22px]" : "text-[17px]"
        }`}
      >
        {title}
      </h1>

      {/* 우측 액션 */}
      {rightAction && <div className="flex shrink-0 items-center gap-1">{rightAction}</div>}
    </header>
  );
};

/** 헤더 우측의 정사각 아이콘 버튼(40px, 둥글기 12) */
export const HeaderIconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { dot?: boolean }
> = ({ dot = false, className = "", children, ...p }) => (
  <button
    type="button"
    {...p}
    className={`relative grid size-10 cursor-pointer place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 ${className}`}
  >
    {children}
    {dot && <span className="absolute top-[9px] right-[9px] size-[7px] rounded-full border-[1.5px] border-white bg-red-500" />}
  </button>
);
