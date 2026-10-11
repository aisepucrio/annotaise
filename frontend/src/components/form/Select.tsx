'use client';

import React, { forwardRef, SelectHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import FormFieldBase from './base/FormFieldBase';
import { formFieldClasses } from './base/formFieldClasses';

export type SelectOption = {
  value: string;
  label: string;
  /** Secondary text shown below the label (e.g. email). Ignored by the native Select. */
  description?: string;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  icon?: ReactNode;
  containerClassName?: string;
  tooltip?: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      options,
      placeholder,
      required = false,
      icon,
      className = '',
      containerClassName = '',
      id,
      disabled = false,
      tooltip,
      ...props
    },
    ref
  ) => {
    return (
      <FormFieldBase label={label} id={id} error={error} required={required} className={containerClassName} tooltip={tooltip}>
        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              formFieldClasses.base,
              formFieldClasses.getBorderColor(!!error),
              formFieldClasses.disabled,
              'pr-10 appearance-none cursor-pointer',
              '[&>option:first-child]:text-metal-400',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled hidden className="text-metal-400">
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-metal-700">
                {option.label}
              </option>
            ))}
          </select>

          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200 pointer-events-none">
            {icon || <ChevronDown className="w-6 h-6" />}
          </div>
        </div>
      </FormFieldBase>
    );
  }
);

Select.displayName = 'Select';

export default Select;
