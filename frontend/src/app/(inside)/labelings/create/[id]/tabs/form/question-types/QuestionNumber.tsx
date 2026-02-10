import { useTranslations } from "@/i18n/use-translations";

export type NumberQuestionConfig = {
  type: "number";
  min?: number;
  max?: number;
  step?: number;
};

export const createDefaultNumberConfig = (): NumberQuestionConfig => ({
  type: "number",
  min: 0,
  max: 100,
  step: 1,
});

type Props = {
  config: NumberQuestionConfig;
  onChange: (config: NumberQuestionConfig) => void;
};

export default function QuestionNumberEditor({}: Props) {
  const { t } = useTranslations();
  return (
    <div className="text-xs text-gray-600">
      {t("labelings.create.questionType.number.noConfig")}
    </div>
  );
}
