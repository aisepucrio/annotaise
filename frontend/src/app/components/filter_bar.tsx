import { Search, Filter } from "lucide-react";

export default function FilterBar() {
  return (
    <div className="flex items-center justify-start gap-3 ml-5">
      {/* Campo de busca */}
      <div className="relative w-[420px]">
        <input
          type="text"
          placeholder="Pesquisar..."
          className="
            w-full rounded-xs border border-gray-300
            px-5 py-2 pr-12 text-sm text-gray-700
            placeholder-gray-400 focus:outline-none
            focus:ring-2 focus:ring-blue-800
            shadow-sm
            border-b-3
            border-b-blue-800
          "
          aria-label="Buscar projeto"
        />
        {/* Ícone de lupa */}
        <div className="absolute right-4 top-2.5 text-gray-500">
          <Search size={18} className="opacity-90" />
        </div>
      </div>

      {/* Botão Filtrar */}
      <button
        className="
          flex items-center gap-2 rounded-lg bg-blue-900
          hover:bg-blue-800 text-white px-4 py-2
          shadow-md text-sm transition-colors cursor-pointer
        "
        type="button"
        aria-label="Abrir filtros"
      >
        <Filter size={16} className="opacity-90" />
        Filtrar
      </button>
    </div>
  );
}
