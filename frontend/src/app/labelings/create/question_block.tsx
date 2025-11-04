import { Plus, Trash2 } from "lucide-react";

export default function QuestionBlock() {
  function deleteComponent() {
    
  }
  return (
    <div className="border-blue-800 border-l-4 border-t-4 rounded-tl-xl rounded-br-xl p-4 mb-4 shadow-xl relative">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-blue-900 font-semibold text-sm">Pergunta</h3>
        <button
          type="button"
          className="text-gray-400 hover:text-red-500 cursor-pointer"
          aria-label="Remover pergunta"
          title="Remover pergunta"
          onClick={() => {deleteComponent();}}
        >
          <Trash2 size={18} />
        </button>
      </div>

      {/* Campos da pergunta */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="Texto da pergunta"
          className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500"
        />
        <select className="w-1/3 border border-gray-300 rounded-md px-3 py-2 text-gray-700 text-sm focus:outline-none focus:border-blue-500" defaultValue="">
          <option value="" disabled>Selecione um tipo</option>
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="range">Intervalo Numérico</option>
          <option value="select">Seleção</option>
          <option value="multi">Seleção múltipla</option>
          <option value="boolean">Sim/Não</option>
        </select>
      </div>

      {/* Caixa de especificações */}
      <textarea
        placeholder="Especificidades do tipo"
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-700 h-20 focus:outline-none focus:border-blue-500 mb-3"
      />

      {/* Alternador “Obrigatória” */}
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="required" className="text-gray-600">Obrigatória</label>
        <input id="required" type="checkbox" className="accent-blue-700 w-4 h-4" />
      </div>

    </div>
  );
}
