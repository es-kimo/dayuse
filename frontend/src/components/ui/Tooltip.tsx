import React from 'react';
import { Tooltip as BaseTooltip } from '@base-ui/react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  sideOffset?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  sideOffset = 6,
  className = '',
}) => {
  return (
    <BaseTooltip.Provider delay={200} closeDelay={100}>
      <BaseTooltip.Root>
        <BaseTooltip.Trigger render={children} />
        <BaseTooltip.Portal>
          <BaseTooltip.Positioner sideOffset={sideOffset} className="z-modal-top">
            <BaseTooltip.Popup
              className={`px-2.5 py-1.5 text-caption bg-night text-white rounded-md shadow-sm max-w-xs origin-[var(--transform-origin)] transition duration-150 ease-out data-[starting-style]:opacity-0 data-[starting-style]:scale-95 data-[ending-style]:opacity-0 data-[ending-style]:scale-95 ${className}`}
            >
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      </BaseTooltip.Root>
    </BaseTooltip.Provider>
  );
};
