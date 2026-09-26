import React from 'react';
import { Header } from './Header';
import { SkipNavLink } from './ui/SkipNavLink';

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showHeader = true }) => {
  return (
    <div className="max-w-app mx-auto min-h-dvh bg-page flex flex-col border-x border-line text-ink font-sans relative">
      <SkipNavLink targetId="main-content" />
      {showHeader && <Header />}
      <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-safe-nav flex flex-col outline-hidden">
        {children}
      </main>
    </div>
  );
};
