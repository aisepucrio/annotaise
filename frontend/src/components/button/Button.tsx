import React from 'react';
import { buttonBase, buttonSize, type ButtonSize } from '@/styles/typography';

type ButtonVariant = 'normal' | 'light' | 'red' | 'green' | 'disabled' | 'white' | 'muted';

type ButtonProps = {
  children?: React.ReactNode;
  /** Lucide icon or similar. */
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Fills available width when true. Default: true. */
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Default: "button"; use "submit" to submit forms. */
  type?: 'button' | 'submit' | 'reset';
  /**
   * Button size. Defines height, padding, text and weight — see `buttonSize`
   * in styles/typography.ts. Do not pass `className="px-4 py-2 text-sm"`.
   */
  size?: ButtonSize;
};

export default function Button({
  children,
  icon,
  onClick,
  variant = 'normal',
  disabled = false,
  className = '',
  fill = true,
  ariaLabel,
  size = 'md',
  type = 'button',
}: ButtonProps) {
  // Colors by variant or disabled state.
  // Known debt (see TYPOGRAPHY.md §4): variants are still painted via inline
  // `style` with hover handlers. Replacing them with classes is a separate refactor.
  const getColors = () => {
    if (disabled || variant === 'disabled') {
      return {
        bg: 'var(--metal-200)',
        text: 'var(--metal-500)',
        hoverBg: 'var(--metal-200)',
      };
    }

    switch (variant) {
      case 'muted':
        return {
          bg: 'var(--metal-100)',
          text: 'var(--metal-700)',
          hoverBg: 'var(--metal-200)',
        };
      case 'white':
        return {
          bg: 'var(--metal-50)',
          text: 'var(--blueberry-700)',
          hoverBg: 'var(--metal-100)',
        };

      case 'light':
        return {
          bg: 'var(--blueberry-500)',
          text: 'var(--metal-50)',
          hoverBg: '#3a50c5', // Slightly darker than blueberry-500
        };
      case 'green':
        return {
          bg: 'var(--green-blueberry)',
          text: 'var(--metal-50)',
          hoverBg: '#1f463f', // Slightly darker than green-blueberry
        };
      case 'red':
        return {
          bg: 'var(--red-blueberry)',
          text: 'var(--metal-50)',
          hoverBg: '#5f1e34', // Slightly darker than red-blueberry
        };
      case 'normal':
      default:
        return {
          bg: 'var(--blueberry-700)',
          text: 'var(--metal-50)',
          hoverBg: '#172673', // Slightly darker than blueberry-700
        };
    }
  };

  const colors = getColors();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${buttonBase} ${buttonSize[size]} ${fill ? 'w-full' : 'w-auto'} ${className}`}
      style={{
        backgroundColor: colors.bg,
        color: colors.text,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.hoverBg;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = colors.bg;
      }}
      type={type}
      aria-label={ariaLabel}
    >
      {icon && (
        <span className="opacity-90 shrink-0" style={{ color: colors.text }}>
          {icon}
        </span>
      )}
      {children && <span className="truncate">{children}</span>}
    </button>
  );
}
