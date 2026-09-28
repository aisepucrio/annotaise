import React from 'react';

type ButtonVariant = 'normal' | 'light' | 'red' | 'green' | 'disabled' | 'white' | 'muted';

type ButtonProps = {
  children?: React.ReactNode;
  /** Lucide icon or similar. */
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  bold?: boolean;
  disabled?: boolean;
  /** Fills available width when true. Default: true. */
  fill?: boolean;
  className?: string;
  ariaLabel?: string;
  /** Default: "button"; use "submit" to submit forms. */
  type?: 'button' | 'submit' | 'reset';
  /** Controls base padding size. */
  size?: 'normal' | 'icon';
};

export default function Button({
  children,
  icon,
  onClick,
  variant = 'normal',
  bold = false,
  disabled = false,
  className = '',
  fill = true,
  ariaLabel,
  size = 'normal',
  type = 'button',
}: ButtonProps) {
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
  const fontWeight = bold ? 'font-bold' : 'font-normal';
  const paddingClasses = size === 'icon' ? 'p-2 ' : 'px-4 py-2';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center ${children ? 'gap-2' : ''} 
        rounded-lg ${paddingClasses}
        transition-colors text-sm cursor-pointer
        ${fill ? 'w-full' : 'w-auto'}
        disabled:cursor-not-allowed
        ${fontWeight}
        ${className}
      `}
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
      <span className="truncate">{children}</span>
    </button>
  );
}