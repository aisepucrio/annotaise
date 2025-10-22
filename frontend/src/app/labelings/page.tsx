import Image from "next/image";
import Sidebar from "../components/sidebar";
import PageHeader from "../components/page_description"
export default function Projects() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64  p-4 min-h-screen">
        <Sidebar></Sidebar>
        <PageHeader page_title="Rotulações" description="Nesta página você pode visualizar todos as rotulações criadas, assim como suas informações principais. Clique em “Gerenciar” para ver mais informações sobre a rotulação."></PageHeader>
        
      </div>
    </div>
  );
}
