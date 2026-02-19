"use client";

import Tooltip from "@/components/tooltip/Tooltip";

export type FormType = "main" | "background";

type FormTypeSelectorProps = {
  value: FormType;
  onChange: (nextValue: FormType) => void;
  ariaLabel: string;
  mainLabel: string;
  mainTooltip: string;
  backgroundLabel: string;
  backgroundTooltip: string;
};

export default function FormTypeSelector({
  value,
  onChange,
  ariaLabel,
  mainLabel,
  mainTooltip,
  backgroundLabel,
  backgroundTooltip,
}: FormTypeSelectorProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative grid h-11 w-full grid-cols-2 overflow-hidden bg-white"
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-blueberry-700 transition-transform duration-300 ease-out ${
          value === "background" ? "translate-x-full" : "translate-x-0"
        }`}
      />

      <button
        type="button"
        role="tab"
        aria-selected={value === "main"}
        onClick={() => onChange("main")}
        className={`relative z-10 h-11 w-full text-sm font-semibold transition-colors duration-300 ${
          value === "main"
            ? "text-white"
            : "text-gray-700 hover:bg-gray-100 hover:text-blueberry-700"
        }`}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <span>{mainLabel}</span>
          <Tooltip
            content={mainTooltip}
            color="currentColor"
            size="md"
            className={`${
              value === "main"
                ? "hover:bg-transparent hover:opacity-100"
                : "hover:bg-gray-300/40"
            }`}
          />
        </span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={value === "background"}
        onClick={() => onChange("background")}
        className={`relative z-10 h-11 w-full text-sm font-semibold transition-colors duration-300 ${
          value === "background"
            ? "text-white"
            : "text-gray-700 hover:bg-gray-100 hover:text-blueberry-700"
        }`}
      >
        <span className="inline-flex items-center justify-center gap-1.5">
          <span>{backgroundLabel}</span>
          <Tooltip
            content={backgroundTooltip}
            color="currentColor"
            size="md"
            className={`${
              value === "background"
                ? "hover:bg-transparent hover:opacity-100"
                : "hover:bg-gray-300/40"
            }`}
          />
        </span>
      </button>
    </div>
  );
}
