import type { ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { MultipleChoiceQuestionConfig } from "../labeling_types";
import { useTranslations } from "@/i18n/use-translations";

type Props = {
  config: MultipleChoiceQuestionConfig;
  onChange: (config: MultipleChoiceQuestionConfig) => void;
};

export default function QuestionMultipleChoiceEditor({
  config,
  onChange,
}: Props) {
  const { t } = useTranslations();
  const handleChoiceTextChange =
    (choiceId: string) => (e: ChangeEvent<HTMLTextAreaElement>) => {
      const updated = config.choices.map((choice) =>
        choice.id === choiceId ? { ...choice, text: e.target.value } : choice
      );
      onChange({ ...config, choices: updated });
    };

  const handleRemoveChoice = (choiceId: string) => {
    const updated = config.choices.filter((choice) => choice.id !== choiceId);
    onChange({ ...config, choices: updated });
  };

  const handleAddChoice = () => {
    onChange({
      ...config,
      choices: [
        ...config.choices,
        {
          id: crypto.randomUUID(),
          text: t("labelings.create.questionType.multipleChoice.optionLabel", {
            index: config.choices.length + 1,
          }),
        },
      ],
    });
  };

  const handleAllowMultipleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...config, allowMultiple: e.target.checked });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-blue-900">
          {t("labelings.create.questionType.multipleChoice.optionsLabel")}
        </span>
        <button
          type="button"
          onClick={handleAddChoice}
          className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs cursor-pointer text-blue-800 hover:bg-blue-200"
        >
          <Plus size={14} />
          {t("labelings.create.questionType.multipleChoice.addOption")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {config.choices.map((choice) => (
          <div key={choice.id} className="flex items-center gap-2">
            <textarea
              className="flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none text-gray-700 cursor-text"
              value={choice.text}
              onChange={handleChoiceTextChange(choice.id)}
              rows={2}
            />
            <button
              type="button"
              onClick={() => handleRemoveChoice(choice.id)}
              className="rounded-md border border-transparent p-1 text-gray-400 hover:text-red-500 cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <label className="flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-blue-700 cursor-pointer"
          checked={config.allowMultiple ?? false}
          onChange={handleAllowMultipleChange}
        />
        {t("labelings.create.questionType.multipleChoice.allowMultiple")}
      </label>
    </div>
  );
}
