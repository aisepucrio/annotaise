import type { ChangeEvent, ComponentType } from "react";
import { Trash2 } from "lucide-react";
import {
  QuestionConfig,
  QuestionElement,
  QuestionType,
  getDefaultQuestionConfig,
} from "./labeling_types";
import {
  QUESTION_TYPE_COMPONENTS,
  QuestionTypeComponentProps,
} from "./questiontypes";

type QuestionBlockProps = {
  data: QuestionElement;
  onUpdate: (patch: Partial<QuestionElement>) => void;
  onRemove: () => void;
  onActivate?: (el: HTMLElement) => void;
};

export default function QuestionBlock({ data, onUpdate, onRemove, onActivate }: QuestionBlockProps) {
  const handleTypeChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as QuestionType;
    onUpdate({
      question_type: newType,
      config: getDefaultQuestionConfig(newType),
    });
  };

  const handleRequiredChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdate({ required: e.target.checked });
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ text: e.target.value });
  };

  const handleConfigChange = (config: QuestionConfig) => {
    onUpdate({ config });
  };

  const selectedType = data.question_type;
  const TypeComponent = selectedType
    ? (QUESTION_TYPE_COMPONENTS[selectedType] as ComponentType<
        QuestionTypeComponentProps<QuestionConfig>
      >)
    : undefined;
  const effectiveConfig =
    selectedType && data.config && data.config.type === selectedType
      ? data.config
      : selectedType
      ? getDefaultQuestionConfig(selectedType)
      : undefined;

  return (
    <div
      className="relative mb-4 rounded-tl-xl rounded-br-xl border-l-4 border-t-4 border-blue-800 p-4 shadow-xl cursor-pointer"
      data-actions-anchor="true"
      data-section-element-id={data.id}
      onClick={(e) => onActivate?.(e.currentTarget)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-900">Pergunta</h3>
        <button
          type="button"
          className="cursor-pointer text-gray-400 hover:text-red-500"
          aria-label="Remover pergunta"
          title="Remover pergunta"
          onClick={onRemove}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <textarea
          placeholder="Texto da pergunta"
          value={data.text || ""}
          onChange={handleTextChange}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none cursor-text"
          rows={1}
        />
        <select
          className="w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none"
          value={data.question_type || ""}
          onChange={handleTypeChange}
        >
          <option value="" disabled>
            Selecione um tipo
          </option>
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="range">Intervalo Numérico</option>
          <option value="multiple_choice">Seleção múltipla</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={`required-${data.id}`} className="text-gray-600 cursor-pointer">
          Obrigatória
        </label>
        <input
          id={`required-${data.id}`}
          type="checkbox"
          checked={data.required || false}
          onChange={handleRequiredChange}
          className="h-4 w-4 accent-blue-700 cursor-pointer"
        />
      </div>

      {selectedType && TypeComponent && effectiveConfig && (
        <div className="mt-4 border-t border-blue-100 pt-4">
          <TypeComponent config={effectiveConfig} onChange={handleConfigChange} />
        </div>
      )}
    </div>
  );
}
