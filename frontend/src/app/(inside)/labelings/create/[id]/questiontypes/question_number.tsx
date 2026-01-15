import { NumberQuestionConfig } from "../labeling_types";
import { useTranslations } from "@/i18n/use-translations";

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
