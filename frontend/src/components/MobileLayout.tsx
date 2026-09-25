import React from 'react';
import { Header } from './Header';

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showHeader = true }) => {
  return (
    <div className="max-w-app mx-auto min-h-screen bg-page flex flex-col border-x border-line text-ink font-sans">
      {showHeader && <Header />}
      <main className="flex-1 p-4 pb-safe-nav flex flex-col">{children}</main>
    </div>
  );
};
