import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';
import FormFieldBase from './base/FormFieldBase';
import { formFieldClasses } from './base/formFieldClasses';

export type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: string;
  error?: string;
  required?: boolean;
  containerClassName?: string;
  tooltip?: string;
};

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      required = false,
      className = '',
      containerClassName = '',
      id,
      disabled = false,
      placeholder = 'dd/mm/aaaa',
      tooltip,
      ...props
    },
    ref
  ) => {
    return (
      <FormFieldBase label={label} id={id} error={error} required={required} className={containerClassName} tooltip={tooltip}>
        <div className="relative">
          <input
            ref={ref}
            type="date"
            id={id}
            data-date-input="true"
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              formFieldClasses.base,
              formFieldClasses.getBorderColor(!!error),
              formFieldClasses.disabled,
              'pr-11 cursor-pointer',
              '[&::-webkit-calendar-picker-indicator]:opacity-0',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
              '[&::-webkit-calendar-picker-indicator]:absolute',
              '[&::-webkit-calendar-picker-indicator]:inset-0',
              '[&::-webkit-calendar-picker-indicator]:w-full',
              '[&::-webkit-calendar-picker-indicator]:h-full',
              '[&::-moz-calendar-picker-indicator]:opacity-0',
              '[&::-moz-calendar-picker-indicator]:cursor-pointer',
              '[&::-moz-calendar-picker-indicator]:absolute',
              '[&::-moz-calendar-picker-indicator]:inset-0',
              '[&::-moz-calendar-picker-indicator]:w-full',
              '[&::-moz-calendar-picker-indicator]:h-full',
              className
            )}
            {...props}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200 pointer-events-none" data-date-icon="true">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </FormFieldBase>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
