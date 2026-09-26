import React from 'react';

export interface SkipNavLinkProps {
  targetId?: string;
  children?: React.ReactNode;
}

export const SkipNavLink: React.FC<SkipNavLinkProps> = ({
  targetId = 'main-content',
  children = '본문 바로가기',
}) => {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:px-4 focus:py-2.5 focus:bg-primary focus:text-white focus:font-bold focus:text-body-sm focus:rounded-md focus:shadow-sheet focus-ring transition-transform"
    >
      {children}
    </a>
  );
};
