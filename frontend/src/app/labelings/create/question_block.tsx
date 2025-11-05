import { Plus, Trash2 } from "lucide-react";
import { QuestionData, QuestionType } from "./labeling_types";

type QuestionBlockProps = {
  data: QuestionData;
  onUpdate: (patch: Partial<QuestionData>) => void;
  onRemove: () => void;
};

export default function QuestionBlock({ data, onUpdate, onRemove }: QuestionBlockProps) {
  // handler for question type changes
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as QuestionType;
    onUpdate({ question_type: newType });
  };

  // handler for required checkbox
  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ required: e.target.checked });
  };

  // handler for question text
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ text: e.target.value });
  };

  return (
    <div className="border-blue-800 border-l-4 border-t-4 rounded-tl-xl rounded-br-xl p-4 mb-4 shadow-xl relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">Pergunta</h3>
        <button
          type="button"
          className="text-gray-400 hover:text-red-500 cursor-pointer"
          aria-label="Remover pergunta"
          title="Remover pergunta"
          onClick={onRemove}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Campos da pergunta */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Texto da pergunta"
          value={data.text || ''}
          onChange={handleTextChange}
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
        />
        <select 
          className="w-1/3 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          value={data.question_type || ''}
          onChange={handleTypeChange}
        >
          <option value="" disabled>Selecione um tipo</option>
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="range">Intervalo Numérico</option>
          <option value="multiple_choice">Seleção múltipla</option>
          <option value="bool">Sim/Não</option>
        </select>
      </div>

      {/* Alternador "Obrigatória" */}
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor={`required-${data.id}`} className="text-gray-600">
          Obrigatória
        </label>
        <input 
          id={`required-${data.id}`}
          type="checkbox"
          checked={data.required || false}
          onChange={handleRequiredChange}
          className="accent-blue-700 w-4 h-4"
        />
      </div>
    </div>
  );
}
