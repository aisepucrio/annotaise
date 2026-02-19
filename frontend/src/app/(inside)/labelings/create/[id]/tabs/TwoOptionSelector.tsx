"use client";

import Tooltip from "@/components/tooltip/Tooltip";

type SelectorOption<TValue extends string> = {
  value: TValue;
  label: string;
  tooltip?: string;
};

type TwoOptionSelectorProps<TValue extends string> = {
  value: TValue;
  onChange: (nextValue: TValue) => void;
  ariaLabel: string;
  options: readonly [SelectorOption<TValue>, SelectorOption<TValue>];
};

export default function TwoOptionSelector<TValue extends string>({
  value,
  onChange,
  ariaLabel,
  options,
}: TwoOptionSelectorProps<TValue>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const normalizedActiveIndex = activeIndex === 1 ? 1 : 0;

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative grid h-11 w-full grid-cols-2 overflow-hidden bg-white"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-blueberry-700 transition-transform duration-300 ease-out ${
          normalizedActiveIndex === 1 ? "translate-x-full" : "translate-x-0"
        }`}
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
              isActive
                ? "text-white"
                : "text-gray-700 hover:bg-gray-100 hover:text-blueberry-700"
            }`}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              <span>{option.label}</span>
              {option.tooltip ? (
                <Tooltip
                  content={option.tooltip}
                  color="currentColor"
                  size="md"
                  className={`${
                    isActive
                      ? "hover:bg-transparent hover:opacity-100"
                      : "hover:bg-gray-300/40"
                  }`}
                />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
