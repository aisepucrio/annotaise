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
  },
  {
    id: 2,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
  },
  {
    id: 3,
    title: "Etc etc de imagens",
    annotators: 10,
    finished: 3,
    pending: 0,
    status: "ok" as const,
  },
  {
    id: 4,
    title: "Classificação de imagens",
    annotators: 5,
    finished: 3,
    pending: 0,
    status: "ok" as const,
  },
  // ...
];


export default function Projects() {
  return (
    <div className="bg-gray-300 h-screen">
      <div className="bg-white rounded-2xl ml-66 h-890/901 mr-2 ">
        <Sidebar></Sidebar>
        <PageHeader page_title="Projetos" description="Nesta página você pode visualizar todos os projetos criados, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre o projeto."></PageHeader>
        <div className="ml-5 mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map(p => (
            <ProjectContainer
            key={p.id}
            title={p.title}
            user_count={p.annotators}
            labelings_done={p.finished}
            labelings_pending={p.pending}
            labelings_late={1}
            />
        ))}
        </div>
      </div>
    </div>
  );
}
