import React from 'react';

type MetricProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

/** Label left, value right: the one way a number is written on a card. */
export default function Metric({ label, value, className = '' }: MetricProps) {
  return (
    <div className={`flex w-full items-baseline justify-between gap-2 text-xs text-metal-500 ${className}`}>
      <span className="truncate">{label}</span>
      <span className="shrink-0 font-semibold text-metal-900">{value}</span>
    </div>
  );
}
