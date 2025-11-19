import type { ChangeEvent } from "react";
import { RangeQuestionConfig } from "../labeling_types";

type Props = {
  config: RangeQuestionConfig;
  onChange: (config: RangeQuestionConfig) => void;
};

export default function QuestionRangeEditor({ config, onChange }: Props) {
  const { min, max, step } = config;

  const handleNumericChange = (field: "min" | "max" | "step") => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const parsed = value === "" ? undefined : Number(value);
    onChange({
      ...config,
      [field]: parsed,
    });
  };

  return (
    <div className="flex flex-col gap-3">
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
        <label className="flex flex-col text-xs text-blue-900">
          Passo
          <input
            type="number"
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            value={step ?? ""}
            min={0}
            step="any"
            onChange={handleNumericChange("step")}
          />
        </label>
      </div>
      {(min !== undefined || max !== undefined || step !== undefined) && (
        <p className="text-xs text-gray-500">
          Faixa configurada: {min ?? "—"} até {max ?? "—"} (passo {step ?? "—"})
        </p>
      )}
    </div>
  );
}
