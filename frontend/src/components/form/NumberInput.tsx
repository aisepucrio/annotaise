import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import FormFieldBase from './base/FormFieldBase';
import { formFieldClasses } from './base/formFieldClasses';

export type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange' | 'value'> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
  leftIcon?: ReactNode;
  required?: boolean;
  containerClassName?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  value?: number | string;
  onChange?: (value: number | string) => void;
  /** When true, clamps the value to min/max on change. */
  autoValidate?: boolean;
};

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      label,
      error,
      icon,
      leftIcon,
      required = false,
      className = '',
      containerClassName = '',
      id,
      disabled = false,
      tooltip,
      min,
      max,
      value,
      onChange,
      autoValidate = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      formFieldClasses.base,
      formFieldClasses.placeholder,
      formFieldClasses.getBorderColor(!!error),
      formFieldClasses.disabled,
      leftIcon && 'pl-11',
      icon && 'pr-11',
      className
    );

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;

      const inputValue = event.target.value;

      if (inputValue === '') {
        onChange('');
        return;
      }

      let numValue = Number(inputValue);

      if (autoValidate) {
        if (min !== undefined && numValue < min) {
          numValue = min;
        }
        if (max !== undefined && numValue > max) {
          numValue = max;
        }
      }

      onChange(numValue);
    };

    return (
      <FormFieldBase label={label} id={id} error={error} required={required} className={containerClassName} tooltip={tooltip}>
        <div className="relative">
          {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-200">{leftIcon}</div>}

          <input
            ref={ref}
            id={id}
            type="number"
            disabled={disabled}
            className={baseClasses}
            min={min}
            max={max}
            value={value}
            onChange={handleChange}
            {...props}
          />

          {icon && <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200">{icon}</div>}
        </div>
      </FormFieldBase>
    );
  }
);

NumberInput.displayName = 'NumberInput';

export default NumberInput;
