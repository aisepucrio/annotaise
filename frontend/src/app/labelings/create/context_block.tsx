import { Plus, Trash2 } from "lucide-react";

type ContextBlockProps = {
  columns?: string[];
};

export default function ContextBlock({ columns = [] }: ContextBlockProps) {
  return (
    <div className="border-2 border-blue-800 rounded-xl p-4 mb-4 relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">Título do contexto</h3>
        <button
          type="button"
          className="text-gray-400 hover:text-red-500"
          aria-label="Remover contexto"
          title="Remover contexto"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Campos de contexto */}
      <div className="flex gap-2 mb-3">
        <select
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
          defaultValue=""
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
          defaultValue=""
        >
          <option value="" disabled>
            Selecione um tipo
          </option>
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="date">Data</option>
          <option value="category">Categoria</option>
        </select>
      </div>

      {/* placeholder para adicionar subcontextos (opcional futuro) */}
      <button
        type="button"
        className="absolute right-2 bottom-2 flex items-center gap-1 text-blue-800 hover:text-blue-600 text-sm"
        title="Adicionar contexto"
        aria-label="Adicionar contexto"
      >
        <Plus size={16} strokeWidth={1.75} /> Adicionar contexto
      </button>
    </div>
  );
}
