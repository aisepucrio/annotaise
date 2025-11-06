import type { ChangeEvent } from "react";
import { NumberQuestionConfig } from "../labeling_types";

type Props = {
  config: NumberQuestionConfig;
  onChange: (config: NumberQuestionConfig) => void;
};

export default function QuestionNumberEditor({ config, onChange }: Props) {
  const { min, max } = config;

  const handleNumericChange =
    (field: keyof Pick<NumberQuestionConfig, "min" | "max" | "step">) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const parsed = value === "" ? undefined : Number(value);
      onChange({ ...config, [field]: parsed });
    };

  return (
    <div className="grid grid-cols-3 gap-3">
      <label className="flex flex-col text-xs text-blue-900">
        Valor mínimo
        <input
          type="number"
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={min ?? ""}
          onChange={handleNumericChange("min")}
        />
      </label>
      <label className="flex flex-col text-xs text-blue-900">
        Valor máximo
        <input
          type="number"
          className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
          value={max ?? ""}
          onChange={handleNumericChange("max")}
        />
      </label>
      
    </div>
  );
}
