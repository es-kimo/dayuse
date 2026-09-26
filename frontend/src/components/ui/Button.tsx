import React, { forwardRef } from 'react';
import { Button as BaseButton } from '@base-ui/react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'dark' | 'warning';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-line disabled:text-ink-disabled shadow-xs',
  secondary:
    'bg-sunken text-ink hover:bg-line active:bg-line-strong disabled:opacity-50 disabled:pointer-events-none',
  danger:
    'bg-danger text-white hover:bg-red-800 active:bg-red-900 disabled:opacity-50 disabled:pointer-events-none shadow-xs',
  warning:
    'bg-warning text-white hover:bg-amber-800 active:bg-amber-900 disabled:opacity-50 disabled:pointer-events-none shadow-xs',
  outline:
    'bg-card border border-line-strong text-ink hover:bg-sunken active:bg-line disabled:opacity-50 disabled:pointer-events-none',
  ghost:
    'bg-transparent text-ink-secondary hover:text-primary hover:bg-sunken active:bg-line disabled:opacity-50 disabled:pointer-events-none',
  dark:
    'bg-ink text-white hover:bg-night disabled:opacity-50 disabled:pointer-events-none shadow-xs',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-btn-sm min-h-[36px] px-3 text-body-sm font-semibold rounded-md',
  md: 'h-btn-md min-h-[44px] px-4 text-body font-semibold rounded-md',
  lg: 'h-btn-lg min-h-[52px] px-6 text-title-sm font-bold rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      fullWidth = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isActuallyDisabled = Boolean(disabled || isLoading);

    return (
      <BaseButton
        ref={ref}
        type={type}
        disabled={isActuallyDisabled}
        aria-busy={isLoading ? 'true' : undefined}
        className={`inline-flex items-center justify-center gap-2 transition duration-150 ease-out active:scale-[0.98] select-none cursor-pointer focus-ring disabled:cursor-not-allowed disabled:active:scale-100 ${
          fullWidth ? 'w-full' : ''
        } ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...rest}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0" aria-hidden="true">{rightIcon}</span>}
          </>
        )}
      </BaseButton>
    );
  }
);

Button.displayName = 'Button';
