import React, { useRef, useEffect } from 'react';
import { AlertDialog as BaseAlertDialog } from '@base-ui/react';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary' | 'warning';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmText = '확인',
  cancelText = '취소',
  confirmVariant = 'danger',
  onConfirm,
  isLoading = false,
}) => {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  // DoD & A11y Requirement: 파괴적 액션 대신 취소 버튼에 초기 초점 부여
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        cancelBtnRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  return (
    <BaseAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop
          className="fixed inset-0 z-modal bg-night/60 backdrop-blur-2xs animate-in fade-in duration-150"
          onClick={(e) => e.stopPropagation()}
        />
        <div
          className="fixed inset-0 z-modal flex items-center justify-center p-4 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <BaseAlertDialog.Popup
            className="pointer-events-auto w-full max-w-sm bg-card rounded-2xl p-5 shadow-sheet border border-line flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150 focus-ring"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger-bg text-danger flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <BaseAlertDialog.Title className="text-title-sm font-bold text-ink">
                  {title}
                </BaseAlertDialog.Title>
                <BaseAlertDialog.Description className="text-body-sm text-ink-secondary mt-1 leading-normal">
                  {description}
                </BaseAlertDialog.Description>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                ref={cancelBtnRef}
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                disabled={isLoading}
                onClick={() => onOpenChange(false)}
              >
                {cancelText}
              </Button>
              <Button
                type="button"
                variant={confirmVariant}
                size="md"
                fullWidth
                isLoading={isLoading}
                onClick={async () => {
                  await onConfirm();
                }}
              >
                {confirmText}
              </Button>
            </div>
          </BaseAlertDialog.Popup>
        </div>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
};

export const AlertDialog = Object.assign(BaseAlertDialog.Root, {
  Trigger: BaseAlertDialog.Trigger,
  Portal: BaseAlertDialog.Portal,
  Backdrop: BaseAlertDialog.Backdrop,
  Popup: BaseAlertDialog.Popup,
  Title: BaseAlertDialog.Title,
  Description: BaseAlertDialog.Description,
  Close: BaseAlertDialog.Close,
  Confirm: ConfirmDialog,
});
