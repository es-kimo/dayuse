import React from 'react';
import { Menu as BaseMenu } from '@base-ui/react';

export const Menu = BaseMenu.Root;
export const MenuTrigger = BaseMenu.Trigger;
export const MenuPortal = BaseMenu.Portal;

export interface MenuPopupProps {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
}

export const MenuPopup: React.FC<MenuPopupProps> = ({ children, className = '', sideOffset = 4 }) => (
  <BaseMenu.Portal>
    <BaseMenu.Positioner sideOffset={sideOffset} className="z-modal-top">
      <BaseMenu.Popup
        className={`min-w-[180px] bg-card border border-line rounded-lg p-1.5 shadow-sheet focus-ring origin-[var(--transform-origin)] transition duration-150 ease-out data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </BaseMenu.Popup>
    </BaseMenu.Positioner>
  </BaseMenu.Portal>
);

export interface MenuItemProps extends React.ButtonHTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSelect?: () => void;
  destructive?: boolean;
}

export const MenuItem: React.FC<MenuItemProps> = ({
  children,
  className = '',
  disabled = false,
  onSelect,
  destructive = false,
  ...props
}) => (
  <BaseMenu.Item
    disabled={disabled}
    onClick={(e) => {
      e.stopPropagation();
      onSelect?.();
    }}
    className={`flex items-center gap-2 px-3 py-2 text-body-sm font-medium rounded-md cursor-pointer transition select-none outline-hidden focus-ring ${
      destructive
        ? 'text-danger hover:bg-danger-bg'
        : 'text-ink hover:bg-sunken hover:text-primary'
    } data-[highlighted]:bg-sunken disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    {...props}
  >
    {children}
  </BaseMenu.Item>
);

export const MenuSeparator: React.FC<{ className?: string }> = ({ className = '' }) => (
  <BaseMenu.Separator className={`h-px bg-line my-1 -mx-1 ${className}`} />
);
