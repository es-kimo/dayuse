import React from 'react';
import { AppHeader } from './AppHeader';

export interface AppMainHeaderProps {
  title?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  border?: boolean;
  className?: string;
}

/**
 * 3개 메인 루트 탭(오늘, 모임, 내 정보)의 상단 헤더.
 * AppHeader(variant="main")의 프록시 컴포넌트입니다.
 */
export const AppMainHeader: React.FC<AppMainHeaderProps> = ({
  title,
  leftAction,
  rightAction,
  border = true,
  className = '',
}) => {
  return (
    <AppHeader
      variant="main"
      title={title}
      leftAction={leftAction}
      rightAction={rightAction}
      border={border}
      className={className}
    />
  );
};
