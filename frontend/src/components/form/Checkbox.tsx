'use client';

import { Check } from 'lucide-react';
import type { CSSProperties, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type CheckboxVariant = 'circle' | 'square';

type NativeCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'>;

type CheckboxProps = NativeCheckboxProps & {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: CheckboxVariant;
  hoverColor?: string;
  checkedColor?: string;
  className?: string;
};

const DEFAULT_HOVER_COLOR = 'var(--blueberry-500)';
const DEFAULT_CHECKED_COLOR = 'var(--blueberry-700)';

export default function Checkbox({
  id,
  checked,
  onChange,
  variant = 'square',
  hoverColor = DEFAULT_HOVER_COLOR,
  checkedColor = DEFAULT_CHECKED_COLOR,
  className,
  disabled,
  ...inputProps
}: CheckboxProps) {
  const checkboxStyle = {
    '--checkbox-hover-color': hoverColor,
  } as CSSProperties;

  return (
    <label
      htmlFor={id}
      className={cn(
        'relative inline-flex items-center justify-center',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        className
      )}
      style={checkboxStyle}
    >
      {/* position: absolute relative to this label keeps the input at the visual
          checkbox position, preventing unexpected scrollIntoView on focus. */}
      <input
        {...inputProps}
        id={id}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer absolute inset-0 w-full h-full opacity-0"
      />

      <span
        aria-hidden="true"
        className={cn(
          'inline-flex h-[18px] w-[18px] items-center justify-center border-2 border-metal-400 bg-full-white transition-all duration-200',
          'peer-hover:border-[var(--checkbox-hover-color)]',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--checkbox-hover-color)] peer-focus-visible:ring-offset-2',
          variant === 'circle' ? 'rounded-full' : 'rounded-[2px]'
        )}
        style={{
          borderColor: checked ? checkedColor : undefined,
          backgroundColor: checked ? checkedColor : undefined,
        }}
      >
        <Check
          className={cn(
            'text-full-white opacity-0 scale-90 transition-all duration-200',
            'h-[15px] w-[15px]',
            checked && 'opacity-100 scale-100'
          )}
        />
      </span>
    </label>
  );
}
