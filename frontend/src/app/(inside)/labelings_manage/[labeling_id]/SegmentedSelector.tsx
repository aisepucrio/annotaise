'use client';

import Tooltip from '@/components/Tooltip';

type SelectorOption<TValue extends string> = {
  value: TValue;
  label: string;
  tooltip?: string;
};

type SegmentedSelectorProps<TValue extends string> = {
  value: TValue;
  onChange: (nextValue: TValue) => void;
  ariaLabel: string;
  options: readonly SelectorOption<TValue>[];
};

export default function SegmentedSelector<TValue extends string>({
  value,
  onChange,
  ariaLabel,
  options,
}: SegmentedSelectorProps<TValue>) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.value === value));
  // Tailwind can't generate widths from a runtime count, so the sliding
  // highlight is sized and moved inline.
  const segmentWidth = `${100 / options.length}%`;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative grid h-11 w-full overflow-hidden bg-white"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 bg-blueberry-700 transition-transform duration-300 ease-out"
        style={{ width: segmentWidth, transform: `translateX(${activeIndex * 100}%)` }}
      />

      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 h-11 w-full text-sm font-semibold transition-colors duration-300 ${
              isActive ? 'text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-blueberry-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <span>{option.label}</span>
              {option.tooltip ? (
                <Tooltip
                  content={option.tooltip}
                  color="currentColor"
                  size="md"
                  className={`${isActive ? 'hover:bg-transparent hover:opacity-100' : 'hover:bg-gray-300/40'}`}
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
