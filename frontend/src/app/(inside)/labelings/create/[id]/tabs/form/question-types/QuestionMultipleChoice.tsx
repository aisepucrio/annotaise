import type { ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "@/i18n/use-translations";
import { TranslateFn } from "../QuestionBlock";
export type MultipleChoiceQuestionConfig = {
  type: "multiple_choice";
  allowMultiple?: boolean;
  choices: MultipleChoiceChoice[];
};

export type MultipleChoiceChoice = {
  id: string;
  text: string;
  value?: boolean;
};

const createDefaultChoices = (t?: TranslateFn): MultipleChoiceChoice[] => [
  {
    id: crypto.randomUUID(),
    text: t
      ? t("labelings.create.questionType.multipleChoice.optionLabel", {
          index: 1,
        })
      : "Option 1",
  },
  {
    id: crypto.randomUUID(),
    text: t
      ? t("labelings.create.questionType.multipleChoice.optionLabel", {
          index: 2,
        })
      : "Option 2",
  },
];

export const createDefaultMultipleChoiceConfig = (
  t?: TranslateFn,
): MultipleChoiceQuestionConfig => ({
  type: "multiple_choice",
  allowMultiple: false,
  choices: createDefaultChoices(t),
});

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
        choice.id === choiceId ? { ...choice, text: e.target.value } : choice,
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
        <span className="text-xs font-semibold text-blueberry-900">
          {t("labelings.create.questionType.multipleChoice.optionsLabel")}
        </span>
        <button
          type="button"
          onClick={handleAddChoice}
          className="flex items-center gap-1 rounded-md border border-blueberry-700 bg-white px-2 py-1 text-xs cursor-pointer text-blueberry-900 hover:bg-blueberry-700 hover:text-white"
        >
          <Plus size={14} />
          {t("labelings.create.questionType.multipleChoice.addOption")}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {config.choices.map((choice) => (
          <div key={choice.id} className="flex items-center gap-2">
            <textarea
              className="flex-1 rounded-md border border-gray-300 px-2 py-2 text-sm focus:border-blueberry-900 focus:outline-none text-gray-700 cursor-text"
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

      <label className="flex items-center gap-2 text-sm text-blueberry-900 cursor-pointer">
        <input
          type="checkbox"
          className="h-4 w-4 accent-blueberry-900 cursor-pointer"
          checked={config.allowMultiple ?? false}
          onChange={handleAllowMultipleChange}
        />
        {t("labelings.create.questionType.multipleChoice.allowMultiple")}
      </label>
    </div>
  );
}
