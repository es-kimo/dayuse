import React, { useId } from 'react';
import { Field as BaseField } from '@base-ui/react';

export interface FormFieldProps {
  label?: React.ReactNode;
  required?: boolean;
  description?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  id?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  description,
  error,
  className = '',
  id: customId,
  children,
}) => {
  const generatedId = useId();
  const fieldId = customId || generatedId;
  const errorId = `${fieldId}-error`;
  const descriptionId = `${fieldId}-description`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className="block text-body-sm font-semibold text-ink">
          {label}
          {required && (
            <>
              <span className="text-danger ml-0.5" aria-hidden="true">
                *
              </span>
              <span className="sr-only">(필수)</span>
            </>
          )}
        </label>
      )}

      {children}

      {description && !error && (
        <p id={descriptionId} className="text-caption text-ink-muted">
          {description}
        </p>
      )}

      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          className="text-caption font-medium text-danger flex items-center gap-1 mt-1"
        >
          {error}
        </div>
      )}
    </div>
  );
};

export const Field = Object.assign(BaseField.Root, {
  Label: BaseField.Label,
  Control: BaseField.Control,
  Description: BaseField.Description,
  Error: BaseField.Error,
  FormField,
});
