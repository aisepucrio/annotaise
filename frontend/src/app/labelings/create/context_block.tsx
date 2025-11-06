import { Trash2 } from "lucide-react";
import type { ContextElement } from "./labeling_types";

type ContextBlockProps = {
  data: ContextElement;
  columns?: string[];
  onUpdate: (patch: Partial<ContextElement>) => void;
  onRemove: () => void;
};

export default function ContextBlock({ data, columns = [], onUpdate, onRemove }: ContextBlockProps) {
  const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ column: e.target.value });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdate({ contextType: e.target.value });
  };

  return (
    <div className="border-blue-800 border-l-4 border-t-4 rounded-tl-xl rounded-br-xl p-4 mb-4 relative shadow-xl">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">Contexto</h3>
        <button
          type="button"
          className="text-gray-400 hover:text-red-500 cursor-pointer"
          aria-label="Remover contexto"
          title="Remover contexto"
          onClick={() => {
            console.log("Removing context:", data);
            onRemove();
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <textarea placeholder="Descrição do contexto" className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500 w-full"></textarea>
      

      {/* Campos de contexto */}
      <div className="flex gap-2 mb-3">
        
        <select
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          value={data.column ?? ""}
          onChange={handleColumnChange}
        >
          <option value="" disabled>
            Selecione uma coluna
          </option>
          {columns.map((col) => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>

        <select
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          value={data.contextType ?? ""}
          onChange={handleTypeChange}
        >
          <option value="" disabled>
            Selecione um tipo
          </option>
          <option value="text">Texto</option>
          <option value="link">Link</option>
          <option value="number">Número</option>
          <option value="image">Imagem</option>
          <option value="audio">Áudio</option>
        </select>
      </div>
    </div>
  );
}
