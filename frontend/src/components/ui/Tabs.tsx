import React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react';

export const Tabs = BaseTabs.Root;

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '', ...props }) => (
  <BaseTabs.List
    className={`flex items-center gap-1 p-1 bg-sunken rounded-lg border border-line ${className}`}
    {...props}
  >
    {children}
  </BaseTabs.List>
);

export interface TabsTabProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export const TabsTab: React.FC<TabsTabProps> = ({ value, children, className = '', disabled, ...props }) => (
  <BaseTabs.Tab
    value={value}
    disabled={disabled}
    className={`flex-1 py-2 px-3 text-body-sm font-semibold rounded-md transition text-center select-none cursor-pointer focus-ring text-ink-secondary data-[active]:bg-card data-[active]:text-primary data-[active]:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </BaseTabs.Tab>
);

export interface TabsPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabsPanel: React.FC<TabsPanelProps> = ({ value, children, className = '', ...props }) => (
  <BaseTabs.Panel
    value={value}
    className={`mt-3 focus-ring rounded-md outline-none ${className}`}
    {...props}
  >
    {children}
  </BaseTabs.Panel>
);
