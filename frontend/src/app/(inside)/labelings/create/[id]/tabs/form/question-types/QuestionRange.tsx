import NumberInput from "@/components/form/NumberInput";
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
    (field: "min" | "max" | "step") => (value: number | string) => {
      const parsed = value === "" ? undefined : Number(value);
      onChange({
        ...config,
        [field]: Number.isNaN(parsed) ? undefined : parsed,
      });
    };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <NumberInput
          label={t("labelings.create.questionType.range.minLabel")}
          value={min ?? ""}
          onChange={handleNumericChange("min")}
        />
        <NumberInput
          label={t("labelings.create.questionType.range.maxLabel")}
          value={max ?? ""}
          onChange={handleNumericChange("max")}
        />
        <NumberInput
          label={t("labelings.create.questionType.range.stepLabel")}
          value={step ?? ""}
          min={0}
          step={0.01}
          onChange={handleNumericChange("step")}
        />
      </div>
      {(min !== undefined || max !== undefined || step !== undefined) && (
        <p className="text-xs text-gray-600">
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
