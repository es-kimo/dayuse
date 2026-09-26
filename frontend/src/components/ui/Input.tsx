import { forwardRef } from 'react';
import { Input as BaseInput } from '@base-ui/react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string | boolean;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error, fullWidth = true, className = '', id, 'aria-describedby': ariaDescribedBy, ...rest }, ref) => {
    const isError = Boolean(error);
    const errorId = id && isError ? `${id}-error` : undefined;
    const combinedDescribedBy = [ariaDescribedBy, errorId].filter(Boolean).join(' ') || undefined;

    return (
      <BaseInput
        ref={ref}
        id={id}
        aria-invalid={isError ? 'true' : undefined}
        aria-describedby={combinedDescribedBy}
        className={`h-input px-3.5 py-2.5 text-base text-ink bg-card rounded-md border transition outline-none focus-ring ${
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

Input.displayName = 'Input';
