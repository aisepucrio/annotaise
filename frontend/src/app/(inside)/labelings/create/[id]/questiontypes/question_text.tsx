import { TextQuestionConfig } from "../labeling_types";

type Props = {
  config: TextQuestionConfig;
  onChange: (config: TextQuestionConfig) => void;
};

export default function QuestionTextEditor({}: Props) {
  return (
    <div className="text-xs text-gray-600">
      Perguntas de texto não possuem configurações adicionais.
    </div>
  );
}
