import Image from "next/image";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description"
export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Usuários" description="Nesta página você pode visualizar todos os usuários cadastrados aos seus projetos assim como informações relevantes sobre eles. Clique em “Gerenciar” para ver mais informações sobre o usuário."></PageHeader>
        
      </div>
    </div>
  );
}
