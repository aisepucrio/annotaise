import Image from "next/image";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description"
import LabelingContainer from "./labeling_container";

const labelings = [
  {
    id: 1,
    title: "Rotulação de imagens de satélite",
    project: "Classificação de imagens",
    days_passed: 12,
    days_total: 10,
    labelings_done: 60,
    labelings_pending: 20,
  },
  {
    id: 2,
    title: "Rotulação de imagens de satélite 2",
    project: "Classificação de imagens",
    days_passed: 5,
    days_total: 10,
    labelings_done: 50,
    labelings_pending: 20,
  },
]


export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Rotulações" description="Nesta página você pode visualizar todos as rotulações criadas, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre a rotulação."></PageHeader>
        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {labelings.map(p => (
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
