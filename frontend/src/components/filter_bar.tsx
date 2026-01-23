import { Search, Filter } from "lucide-react";
import Button from "./button/Button";
import { useTranslations } from "@/i18n/use-translations";

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function FilterBar({
  value,
  onChange,
  placeholder,
  disabled,
}: FilterBarProps) {
  const { t } = useTranslations();
  
  return (
    <div className="flex items-center justify-start gap-3 ml-5">
      {/* Campo de busca */}
      <div className="relative w-[420px]">
        <input
          type="text"
          placeholder={placeholder || t("filterBar.searchPlaceholder")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="
            w-full rounded-xs bg-metal-50
            px-5 py-2 pr-12 text-sm text-gray-700
            placeholder-gray-400 focus:outline-none
            shadow-sm
            border-b-3
            border-b-blueberry-700
            disabled:bg-gray-100 disabled:text-gray-500
          "
          aria-label={t("filterBar.searchAria")}
          disabled={disabled}
        />
        {/* Ícone de lupa */}
        <div className="absolute right-4 top-2.5 text-gray-500">
          <Search size={18} className="opacity-90" />
        </div>
      </div>

      {/* Botão Filtrar */}
      <Button
        variant="normal"
        icon={<Filter size={16} className="opacity-90" />}
        fill={false}
        className="px-4 py-2 shadow-md text-sm"
        ariaLabel={t("filterBar.filterAria")}
      >
        {t("filterBar.filterButton")}
      </Button>
    </div>
  );
}
