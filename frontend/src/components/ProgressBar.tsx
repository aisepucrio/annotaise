import React from 'react';

type ProgressBarProps = {
  /** Value on a 0-100 scale, or any other scale paired with `max`. */
  value: number;
  max?: number;
  label?: string;
  bgColor?: string;
  fillColor?: string;
  rounded?: 'all' | 'right' | 'left' | 'none';
  height?: string;
  className?: string;
  labelClassName?: string;
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  bgColor = 'bg-gray-200',
  fillColor = 'bg-blue-500',
  rounded = 'all',
  height = '32px',
  className = '',
  labelClassName = 'text-gray-800',
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  const getRoundedClass = () => {
    switch (rounded) {
      case 'right':
        return 'rounded-r-full';
      case 'left':
        return 'rounded-l-full';
      case 'none':
        return '';
      case 'all':
      default:
        return 'rounded-full';
    }
  };

  const roundedClass = getRoundedClass();

  return (
    <div className={`w-full min-w-0 ${className}`}>
      <div className="relative w-full">
        <div className={`w-full ${bgColor} ${roundedClass} overflow-hidden`} style={{ height }}>
          <div
            className={`h-full ${fillColor} transition-all duration-200`}
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label}
          />
        </div>
        {label && (
          <span
            className={`absolute inset-0 flex items-center justify-center text-sm font-medium pointer-events-none px-2 truncate ${labelClassName}`}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
