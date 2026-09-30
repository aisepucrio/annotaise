import React from 'react';

type ProgressBarProps = {
  /** Value on a 0-100 scale, or any other scale paired with `max`. */
  value: number;
  max?: number;
  /** Sits above the track, not inside it. Wrap the counters in a bold span to match the stat chips. */
  label?: React.ReactNode;
  bgColor?: string;
  fillColor?: string;
  height?: string;
  className?: string;
  labelClassName?: string;
};

export default function ProgressBar({
  value,
  max = 100,
  label,
  bgColor = 'bg-metal-100',
  fillColor = 'bg-blueberry-700',
  height = '6px',
  className = '',
  labelClassName = 'text-metal-500',
}: ProgressBarProps) {
  const percent = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {label && <div className={`mb-1 text-xs ${labelClassName}`}>{label}</div>}

      <div className={`w-full overflow-hidden rounded-full ${bgColor}`} style={{ height }}>
        <div
          className={`h-full rounded-full ${fillColor} transition-all duration-300`}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={typeof label === 'string' ? label : undefined}
        />
      </div>
    </div>
  );
}
