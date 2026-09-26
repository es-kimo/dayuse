import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { DayuExpression, type ExpressionType } from './brand/DayuExpression';

interface EmptyStateProps {
  icon?: LucideIcon;
  expression?: ExpressionType;
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
  expression,
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
      {expression ? (
        <DayuExpression
          expression={expression}
          color="blue"
          className={`${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'}`}
        />
      ) : Icon ? (
        <div className={`rounded-full bg-primary-subtle text-primary flex items-center justify-center ${compact ? 'w-12 h-12 mb-3' : 'w-16 h-16 mb-4'}`}>
          <Icon className={compact ? 'w-6 h-6' : 'w-8 h-8'} />
        </div>
      ) : null}
      <h3 className={`${compact ? 'text-title-sm' : 'text-title-md'} text-ink mb-1`}>{title}</h3>
      <p className="text-body-sm text-ink-muted mb-5 max-w-xs leading-relaxed">{description}</p>
      {(actionText || secondaryActionText) && (
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
          {actionText && onAction && (
            <button
              type="button"
              onClick={onAction}
              className="w-full sm:flex-1 h-btn-md px-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-white rounded-md text-body-sm font-semibold transition focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-primary-muted flex items-center justify-center gap-1.5"
            >
              {actionText}
            </button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="w-full sm:flex-1 h-btn-md px-4 bg-sunken hover:bg-line text-ink rounded-md text-body-sm font-semibold transition active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary flex items-center justify-center gap-1.5"
            >
              {secondaryActionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
