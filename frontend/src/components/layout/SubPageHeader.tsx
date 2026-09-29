import React from 'react';
import { AppHeader } from './AppHeader';

export interface SubPageHeaderProps {
  title?: React.ReactNode;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  onBack?: () => void;
  border?: boolean;
  className?: string;
}

/**
 * 서브 페이지(상세, 생성, 설정 등)의 공통 헤더.
 * AppHeader(variant="sub")의 프록시 컴포넌트입니다.
 */
export const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  title,
  leftAction,
  rightAction,
  onBack,
  border = true,
  className = '',
}) => {
  return (
    <AppHeader
      variant="sub"
      title={title}
      leftAction={leftAction}
      rightAction={rightAction}
      onBack={onBack}
      border={border}
      className={className}
    />
  );
};
