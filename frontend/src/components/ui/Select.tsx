import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string | boolean;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, fullWidth = true, className = '', id, children, 'aria-describedby': ariaDescribedBy, ...rest }, ref) => {
    const isError = Boolean(error);
    const errorId = id && isError ? `${id}-error` : undefined;
    const combinedDescribedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <div className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}>
        <select
          ref={ref}
          id={id}
          aria-invalid={isError ? 'true' : undefined}
          aria-describedby={combinedDescribedBy}
          className={`h-input min-h-[44px] appearance-none pl-3.5 pr-10 py-2.5 text-base text-ink bg-card rounded-md border transition outline-none focus-ring ${
            isError
              ? 'border-danger-icon focus:border-danger focus:ring-danger/20'
              : 'border-line-strong focus:border-primary focus:ring-primary/20'
          } disabled:bg-sunken disabled:text-ink-disabled disabled:cursor-not-allowed ${
            fullWidth ? 'w-full' : ''
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-ink-muted" aria-hidden="true">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
