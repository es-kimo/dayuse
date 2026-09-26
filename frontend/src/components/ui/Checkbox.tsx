import React, { useId } from 'react';
import { Checkbox as BaseCheckbox } from '@base-ui/react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  name?: string;
  value?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  id: customId,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled = false,
  label,
  description,
  name,
  value,
  className = '',
}) => {
  const generatedId = useId();
  const id = customId || generatedId;

  return (
    <div className={`flex items-start gap-2.5 min-h-[44px] py-1 select-none ${className}`}>
      <BaseCheckbox.Root
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={(nextChecked) => onCheckedChange?.(Boolean(nextChecked))}
        disabled={disabled}
        className="w-5 h-5 rounded border border-line-strong bg-card text-white flex items-center justify-center transition focus-ring cursor-pointer data-[checked]:bg-primary data-[checked]:border-primary disabled:opacity-50 disabled:cursor-not-allowed shrink-0 mt-0.5"
      >
        <BaseCheckbox.Indicator className="flex items-center justify-center">
          <Check className="w-3.5 h-3.5 stroke-[3]" aria-hidden="true" />
        </BaseCheckbox.Indicator>
      </BaseCheckbox.Root>

      {label && (
        <label htmlFor={id} className="cursor-pointer text-body-sm text-ink font-medium leading-tight">
          <div>{label}</div>
          {description && <p className="text-caption text-ink-muted mt-0.5">{description}</p>}
        </label>
      )}
    </div>
  );
};
