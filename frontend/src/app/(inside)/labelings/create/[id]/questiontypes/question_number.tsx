import { NumberQuestionConfig } from "../labeling_types";

type Props = {
  config: NumberQuestionConfig;
  onChange: (config: NumberQuestionConfig) => void;
};

export default function QuestionNumberEditor({}: Props) {
  return (
    <div className="text-xs text-gray-600">
      Perguntas numéricas não possuem configurações adicionais.
    </div>
  );
}
