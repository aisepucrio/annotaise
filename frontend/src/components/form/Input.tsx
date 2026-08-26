import React, { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import FormFieldBase from './base/FormFieldBase';
import { formFieldClasses } from './base/formFieldClasses';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
  /** When set, the right icon becomes a clickable button. */
  onIconClick?: () => void;
  leftIcon?: ReactNode;
  required?: boolean;
  containerClassName?: string;
  multiline?: boolean;
  rows?: number;
  /** Only applies when multiline is true. Default: false. */
  resizable?: boolean;
  tooltip?: string;
};

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      onIconClick,
      leftIcon,
      required = false,
      className = '',
      containerClassName = '',
      id,
      disabled = false,
      multiline = false,
      rows = 4,
      resizable = false,
      tooltip,
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
      !resizable && multiline && 'resize-none',
      className
    );

    return (
      <FormFieldBase label={label} id={id} error={error} required={required} className={containerClassName} tooltip={tooltip}>
        <div className="relative">
          {leftIcon && !multiline && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-200">{leftIcon}</div>}

          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              disabled={disabled}
              rows={rows}
              className={baseClasses}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input ref={ref as React.Ref<HTMLInputElement>} id={id} disabled={disabled} className={baseClasses} {...props} />
          )}

          {icon && !multiline && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-metal-200">
              {onIconClick ? (
                <button type="button" onClick={onIconClick} className="focus:outline-none hover:text-metal-500 transition-colors">
                  {icon}
                </button>
              ) : (
                icon
              )}
            </div>
          )}
        </div>
      </FormFieldBase>
    );
  }
);

Input.displayName = 'Input';

export default Input;
