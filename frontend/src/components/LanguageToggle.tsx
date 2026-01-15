"use client";

import { BR, GB } from "country-flag-icons/react/3x2";
import { useLanguage } from "@/i18n/language-context";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  collapsed?: boolean;
};

const OPTIONS = [
  { code: "pt-BR" as const, label: "Portuguese", Flag: BR },
  { code: "en" as const, label: "English", Flag: GB },
];

export default function LanguageToggle({
  collapsed = false,
}: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={cn(
        "flex gap-2",
        collapsed ? "flex-col items-center" : "flex-row"
      )}
    >
      {OPTIONS.map(({ code, label, Flag }) => {
        const isActive = language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={isActive}
            aria-label={`Change language to ${label}`}
            className={cn(
              "rounded-md border p-1 transition",
              "bg-white hover:bg-gray-100",
              isActive
                ? "border-blueberry-700 ring-2 ring-blueberry-700"
                : "border-transparent"
            )}
          >
            <Flag className="h-6 w-8" title={label} />
          </button>
        );
      })}
    </div>
  );
}
