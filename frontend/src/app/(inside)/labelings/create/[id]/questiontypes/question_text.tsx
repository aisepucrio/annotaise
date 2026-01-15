import { TextQuestionConfig } from "../labeling_types";
import { useTranslations } from "@/i18n/use-translations";

type Props = {
  config: TextQuestionConfig;
  onChange: (config: TextQuestionConfig) => void;
};

export default function QuestionTextEditor({}: Props) {
  const { t } = useTranslations();
  return (
    <div className="text-xs text-gray-600">
      {t("labelings.create.questionType.text.noConfig")}
    </div>
  );
}
