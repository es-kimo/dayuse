import React, { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string | boolean;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ error, fullWidth = true, className = '', id, 'aria-describedby': ariaDescribedBy, ...rest }, ref) => {
    const isError = Boolean(error);
    const errorId = id && isError ? `${id}-error` : undefined;
    const combinedDescribedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <textarea
        ref={ref}
        id={id}
        aria-invalid={isError ? 'true' : undefined}
        aria-describedby={combinedDescribedBy}
        className={`px-3.5 py-2.5 text-base text-ink bg-card rounded-md border transition outline-none focus-ring min-h-[100px] resize-y ${
          isError
            ? 'border-danger-icon focus:border-danger focus:ring-danger/20'
            : 'border-line-strong focus:border-primary focus:ring-primary/20'
        } disabled:bg-sunken disabled:text-ink-disabled disabled:cursor-not-allowed ${
          fullWidth ? 'w-full' : ''
        } ${className}`}
        {...rest}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
