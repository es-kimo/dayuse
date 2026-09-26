import React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  hasUnsavedChanges?: boolean;
  unsavedWarningMessage?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
};

export const Dialog: React.FC<DialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  hasUnsavedChanges = false,
  unsavedWarningMessage = '작성 중인 내용이 저장되지 않았습니다. 정말 닫으시겠습니까?',
  maxWidth = 'sm',
  className = '',
}) => {
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && hasUnsavedChanges) {
      if (!window.confirm(unsavedWarningMessage)) {
        return;
      }
    }
    onOpenChange(nextOpen);
  };

  return (
    <BaseDialog.Root open={open} onOpenChange={handleOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop
          className="fixed inset-0 z-modal bg-night/60 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <BaseDialog.Popup
            className={`pointer-events-auto w-full ${maxWidthMap[maxWidth]} bg-card rounded-2xl p-5 shadow-sheet border border-line flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 focus-ring ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {(title || description) && (
              <div className="flex items-start justify-between pb-3 mb-3 border-b border-line shrink-0">
                <div className="pr-4">
                  {title && (
                    <BaseDialog.Title className="text-title-sm font-bold text-ink leading-tight">
                      {title}
                    </BaseDialog.Title>
                  )}
                  {description && (
                    <BaseDialog.Description className="text-caption text-ink-muted mt-1 leading-normal">
                      {description}
                    </BaseDialog.Description>
                  )}
                </div>
                <BaseDialog.Close
                  aria-label="닫기"
                  className="p-1 -mr-1 text-ink-muted hover:text-ink rounded-md focus-ring min-w-[36px] min-h-[36px] inline-flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </BaseDialog.Close>
              </div>
            )}
            <div className="flex-1 min-h-0">{children}</div>
          </BaseDialog.Popup>
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
};

export const DialogRoot = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;
export const DialogPortal = BaseDialog.Portal;
export const DialogBackdrop = BaseDialog.Backdrop;
export const DialogPopup = BaseDialog.Popup;
export const DialogTitle = BaseDialog.Title;
export const DialogDescription = BaseDialog.Description;
export const DialogClose = BaseDialog.Close;
