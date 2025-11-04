"use client";

import { useState } from "react";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description";
import FilterBar from "../components/filter_bar";
import LabelingContainer from "./labeling_container";
import { Plus } from "lucide-react";
import UploadCsvModal from "./upload_csv_modal";
import { useRouter } from "next/navigation";

const labelings = [
  { id: 1, title: "Sentimento em Reviews", project: "Projeto A", days_passed: 7, days_total: 10, labelings_done: 120, labelings_pending: 30 },
  { id: 2, title: "Classificação de Imagens", project: "Projeto B", days_passed: 12, days_total: 10, labelings_done: 80, labelings_pending: 40 },
  { id: 3, title: "Extração de Entidades", project: "Projeto C", days_passed: 3, days_total: 15, labelings_done: 15, labelings_pending: 5 },
];

export default function LabelingsPage() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleConfirm(columns: string[]) {
    // guarda as colunas para a próxima tela (mock de “upload feito”)
    localStorage.setItem("labeling_csv_columns", JSON.stringify(columns));
    setOpen(false);
    router.push("/labelings/create");
  }

  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader
          page_title="Rotulações"
          description="Visualize e gerencie rotulações. Clique em 'Nova Rotulação' para importar um CSV e iniciar a configuração."
        />

        <div className="flex flex-nowrap items-center mt-5">
          <FilterBar />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir nova rotulação"
            className="ml-auto mr-6 flex items-center gap-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white px-4 py-2 shadow-md text-sm transition-colors cursor-pointer"
          >
            <Plus size={16} strokeWidth={1.75} className="opacity-90" />
            Nova Rotulação
          </button>
        </div>

        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
          {labelings.map((l) => (
            <LabelingContainer
              key={l.id}
              title={l.title}
              project={l.project}
              days_passed={l.days_passed}
              days_total={l.days_total}
              labelings_done={l.labelings_done}
              labelings_pending={l.labelings_pending}
            />
          ))}
        </div>
      </div>

      {/* Modal */}
      <UploadCsvModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
