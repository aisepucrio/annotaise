import Image from "next/image";
import Sidebar from "./sidebar";
import PageHeader from "./page_description";
export default function Home() {
  return (
    <div className="bg-gray-300 h-screen">
      <div className="bg-white rounded-2xl ml-66 h-890/901">
        <Sidebar></Sidebar>
        <PageHeader page_title="Home" description="Aqui Você Pode Ver Seus Dashboards etc etc etc etc etc"></PageHeader>
        
      </div>
    </div>
  );
}
