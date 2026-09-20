import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  compact = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'p-6 my-2' : 'p-8 my-auto'}`}>
      <div className={`rounded-full bg-blue-50 text-blue-600 flex items-center justify-center ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'}`}>
        <Icon className={compact ? 'w-6 h-6' : 'w-8 h-8'} />
      </div>
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-slate-800 mb-1`}>{title}</h3>
      <p className="text-xs text-slate-500 mb-5 max-w-xs leading-relaxed">{description}</p>
      {(actionText || secondaryActionText) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center justify-center gap-1.5"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
