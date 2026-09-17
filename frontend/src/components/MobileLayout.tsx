import React from 'react';
import { Header } from './Header';

interface MobileLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, showHeader = true }) => {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col border-x border-slate-200 text-slate-800">
      {showHeader && <Header />}
      <main className="flex-1 p-4 pb-12 flex flex-col">{children}</main>
    </div>
  );
};
