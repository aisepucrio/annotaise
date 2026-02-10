import type { ChangeEvent } from "react";
import { useTranslations } from "@/i18n/use-translations";

export type RangeQuestionConfig = {
  type: "range";
  min?: number;
  max?: number;
  step?: number;
};

export const createDefaultRangeConfig = (): RangeQuestionConfig => ({
  type: "range",
  min: 0,
  max: 10,
  step: 1,
});

type Props = {
  config: RangeQuestionConfig;
  onChange: (config: RangeQuestionConfig) => void;
};

export default function QuestionRangeEditor({ config, onChange }: Props) {
  const { t } = useTranslations();
  const { min, max, step } = config;

  const handleNumericChange =
    (field: "min" | "max" | "step") => (e: ChangeEvent<HTMLInputElement>) => {
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
        <label className="flex flex-col text-xs text-blueberry-900">
          {t("labelings.create.questionType.range.minLabel")}
          <input
            type="number"
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blueberry-900 focus:outline-none cursor-text"
            value={min ?? ""}
            onChange={handleNumericChange("min")}
          />
        </label>
        <label className="flex flex-col text-xs text-blueberry-900">
          {t("labelings.create.questionType.range.maxLabel")}
          <input
            type="number"
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blueberry-900 focus:outline-none cursor-text"
            value={max ?? ""}
            onChange={handleNumericChange("max")}
          />
        </label>
        <label className="flex flex-col text-xs text-blueberry-900">
          {t("labelings.create.questionType.range.stepLabel")}
          <input
            type="number"
            className="mt-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blueberry-900 focus:outline-none cursor-text"
            value={step ?? ""}
            min={0}
            step="any"
            onChange={handleNumericChange("step")}
          />
        </label>
      </div>
      {(min !== undefined || max !== undefined || step !== undefined) && (
        <p className="text-xs text-gray-500">
          {t("labelings.create.questionType.range.summary", {
            min: min ?? "-",
            max: max ?? "-",
            step: step ?? "-",
          })}
        </p>
      )}
    </div>
  );
}
