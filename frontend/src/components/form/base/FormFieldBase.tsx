import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/Tooltip';

export type FormFieldBaseProps = {
  label?: string;
  /** Connects the label to the input via htmlFor. */
  id?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  tooltip?: string;
};

/**
 * Base wrapper for form fields: floating label, required indicator, optional tooltip, and error message.
 */
export default function FormFieldBase({ label, id, error, required = false, children, className = '', tooltip }: FormFieldBaseProps) {
  return (
    <div className={cn('relative w-full', className)}>
      {label && (
        <div className="absolute -top-3 left-3 bg-white px-2 z-10 hover:z-50 flex items-center gap-1">
          <label htmlFor={id} className="text-sm text-metal-700">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {tooltip && <Tooltip content={tooltip} color="var(--metal-700)" size="sm" />}
        </div>
      )}

      {children}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
