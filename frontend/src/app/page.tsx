import Sidebar from "./components/sidebar";
import PageHeader from "./components/page_description";

export default function Home() {
  return (
    <div className="bg-gray-300 min-h-screen">
      <div className="bg-white ml-64 p-4 min-h-screen">
        <Sidebar />
        <PageHeader page_title="Home" description="Aqui Você Pode Ver Seus Dashboards etc etc etc etc etc" />
      </div>
    </div>
  );
}
