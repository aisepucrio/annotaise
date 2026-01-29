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
        "flex w-full pt-6 px-2",
        collapsed ? "flex-col items-center gap-2" : "flex-row justify-between",
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
              "relative flex flex-col items-center rounded-md transition",
              "bg-white hover:bg-gray-100",
              "leading-none",
              isActive ? "border-blueberry-700" : "border-transparent",
              isActive &&
                "after:content-[''] after:absolute after:inset-0 after:rounded-xs after:border after:ring-3  after:ring-blueberry-700 after:pointer-events-none",
            )}
          >
            <span className="block leading-none">
              <Flag
                className={cn(collapsed ? "h-4 w-6" : "h-8 w-12", "rounded-xs")}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
