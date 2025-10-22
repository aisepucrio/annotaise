import Image from "next/image";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description"
import ProjectContainer from "./project_container";

const projects = [
  {
    id: 1,
    title: "Avaliação de sentimentos com ChatGpt",
    annotators: 5,
    finished: 2,
    pending: 1,
    status: "overdue" as const,
    labelings_late:1
  },
  {
    id: 2,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:0
  },
  {
    id: 3,
    title: "Etc etc de imagens",
    annotators: 10,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:2
  },
  {
    id: 4,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:10
  },
  {
    id: 5,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:10
  },
  {
    id: 6,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:10
  },
  {
    id: 7,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
    labelings_late:10
  },
  // ...
];


export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Projetos" description="Nesta página você pode visualizar todos os projetos criados, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre o projeto."></PageHeader>
        <div className="ml-5 mr-5 mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(p => (
            <ProjectContainer
            key={p.id}
            title={p.title}
            user_count={p.annotators}
            labelings_done={p.finished}
            labelings_pending={p.pending}
            labelings_late={p.labelings_late}
            />
        ))}
        </div>
      </div>
    </div>
  );
}
