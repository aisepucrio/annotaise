import { Search, Filter } from 'lucide-react';
import Button from '@/components/button/Button';

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  filterButtonText?: string;
  onFilterClick?: () => void;
  showFilterButton?: boolean;
};

export default function FilterBar({
  value,
  onChange,
  placeholder,
  disabled,
  filterButtonText,
  onFilterClick,
  showFilterButton = true,
}: FilterBarProps) {
  return (
    <div className="flex items-center justify-start gap-3 ml-5">
      <div className="relative w-[420px]">
        <input
          type="text"
          placeholder={placeholder}
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
          disabled={disabled}
        />
        <div className="absolute right-4 top-2.5 text-gray-500">
          <Search size={18} className="opacity-90" />
        </div>
      </div>

      {showFilterButton && (
        <Button
          variant="normal"
          icon={<Filter size={16} className="opacity-90" />}
          fill={false}
          className="px-4 py-2 shadow-md text-sm"
          onClick={onFilterClick}
        >
          {filterButtonText}
        </Button>
      )}
    </div>
  );
}
