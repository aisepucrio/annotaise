import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import LabelingContainer from "./labeling_container";
import FilterBar from "../components/filter_bar";
import { Plus } from "lucide-react";

const labelings = [
  { id: 1, title: "Rotulação com IA", project: "Classificação de imagens", days_passed: 12, days_total: 10, labelings_done: 60, labelings_pending: 20 },
  { id: 2, title: "Rotulação de imagens de satélite 2", project: "Classificação de imagens", days_passed: 5, days_total: 10, labelings_done: 50, labelings_pending: 20 },
  { id: 3, title: "Rotulação de imagens de satélite 3", project: "Classificação de imagens", days_passed: 5, days_total: 10, labelings_done: 50, labelings_pending: 20 },
  { id: 4, title: "rotulação de imagens de satélite 4", project: "Classificação de imagens", days_passed: 10, days_total: 10, labelings_done: 10, labelings_pending: 20 },
];

export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title="Rotulações"
          description="Nesta página você pode visualizar todos as rotulações criadas, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre a rotulação."
        />
        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <button
              type="button"
              aria-label="Criar nova rotulação"
              className="
                ml-auto mr-6
                inline-flex items-center justify-center gap-2
                rounded-lg bg-blue-900 hover:bg-blue-800 text-white
                px-5 py-2 h-10
                min-w-[190px] whitespace-nowrap
                shadow-md text-sm transition-colors cursor-pointer
              "
            >
              <Plus size={16} strokeWidth={1.75} className="opacity-90" />
              Nova Rotulação
          </button>

        </div>

        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {labelings.map((p) => (
            <LabelingContainer
              key={p.id}
              project={p.project}
              title={p.title}
              days_passed={p.days_passed}
              days_total={p.days_total}
              labelings_done={p.labelings_done}
              labelings_pending={p.labelings_pending}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
