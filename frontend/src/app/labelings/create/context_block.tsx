import { Plus, Trash2 } from "lucide-react";

export default function ContextBlock() {
  return (
    <div className="border-2 border-blue-800 rounded-xl p-4 mb-4 relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">Título do contexto</h3>
        <Trash2 className="text-gray-400 hover:text-red-500 cursor-pointer" size={18} />
      </div>

      {/* Campos de contexto */}
      <div className="flex gap-2 mb-3">
        <select className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500">
          <option>Selecione uma coluna</option>
        </select>

        <select className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500">
          <option>Selecione um tipo</option>
        </select>
      </div>

      {/* Botão para adicionar contexto */}
      <button
        type="button"
        className="absolute right-2 bottom-2 flex items-center gap-1 text-blue-800 hover:text-blue-600 text-sm"
      >
        <Plus size={16} strokeWidth={1.75} /> Adicionar contexto
      </button>
    </div>
  );
}
