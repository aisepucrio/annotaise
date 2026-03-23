import { useId } from "react";
import Checkbox from "@/components/form/Checkbox";
import NumberInput from "@/components/form/NumberInput";
import { useTranslations } from "@/i18n/use-translations";

export type NumberQuestionConfig = {
  type: "number";
  hasMin?: boolean;
  hasMax?: boolean;
  min?: number;
  max?: number;
};

const DEFAULT_NUMBER_LIMITS = {
  min: 0,
  max: 100,
} as const;

export const createDefaultNumberConfig = (): NumberQuestionConfig => ({
  type: "number",
  hasMin: false,
  hasMax: false,
  min: DEFAULT_NUMBER_LIMITS.min,
  max: DEFAULT_NUMBER_LIMITS.max,
});

type Props = {
  config: NumberQuestionConfig;
  onChange: (config: NumberQuestionConfig) => void;
};

export default function QuestionNumberEditor({ config, onChange }: Props) {
  const { t } = useTranslations();
  const inputId = useId();
  const hasMin = config.hasMin ?? false;
  const hasMax = config.hasMax ?? false;

  const handleToggle =
    (field: "hasMin" | "hasMax") => (checked: boolean) => {
      onChange({
        ...config,
        [field]: checked,
        [field === "hasMin" ? "min" : "max"]:
          field === "hasMin"
            ? config.min ?? DEFAULT_NUMBER_LIMITS.min
            : config.max ?? DEFAULT_NUMBER_LIMITS.max,
      });
    };

  const handleNumericChange =
    (field: "min" | "max") => (value: number | string) => {
      const parsed = value === "" ? undefined : Number(value);
      const nextValue = Number.isNaN(parsed) ? undefined : parsed;

      if (field === "min") {
        onChange({
          ...config,
          min: nextValue,
          max:
            hasMax && nextValue !== undefined && (config.max ?? 0) < nextValue
              ? nextValue
              : config.max,
        });
        return;
      }

      onChange({
        ...config,
        max: nextValue,
        min:
          hasMin && nextValue !== undefined && (config.min ?? 0) > nextValue
            ? nextValue
            : config.min,
      });
    };

  const activeSummary = [
    hasMin
      ? t("labelings.create.questionType.number.summaryMin", {
          min: config.min ?? DEFAULT_NUMBER_LIMITS.min,
        })
      : null,
    hasMax
      ? t("labelings.create.questionType.number.summaryMax", {
          max: config.max ?? DEFAULT_NUMBER_LIMITS.max,
        })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`number-min-${inputId}`}
            checked={hasMin}
            onChange={handleToggle("hasMin")}
            checkedColor="var(--blueberry-500)"
            className="shrink-0"
          />
          <NumberInput
            label={t("labelings.create.questionType.number.minLabel")}
            value={config.min ?? ""}
            onChange={handleNumericChange("min")}
            disabled={!hasMin}
            containerClassName="flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id={`number-max-${inputId}`}
            checked={hasMax}
            onChange={handleToggle("hasMax")}
            checkedColor="var(--blueberry-500)"
            className="shrink-0"
          />
          <NumberInput
            label={t("labelings.create.questionType.number.maxLabel")}
            value={config.max ?? ""}
            onChange={handleNumericChange("max")}
            disabled={!hasMax}
            containerClassName="flex-1"
          />
        </div>
      </div>

      <p className="text-xs text-gray-600">
        {activeSummary || t("labelings.create.questionType.number.basicMode")}
      </p>
    </div>
  );
}
