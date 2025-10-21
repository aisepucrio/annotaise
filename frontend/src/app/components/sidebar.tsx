import Image from "next/image";
import SidebarItem from "./sidebar_item";
export default function Sidebar() {
  return (
    <div className="flex">
      <aside
        className="
          fixed top-0 left-0
          h-screen
          w-64
          bg-white
          shadow-xl
          rounded-r-l
          flex flex-col
          justify-between
          p-6                /* padding relativo e responsivo */
        "
      >
        <Image
            src="/light_theme_logo.png"
            alt="Logo"
            width={220}
            height={40}
            className="mx-auto mb-6"
        />

        {/* barra que separa o logo */}
        <div className="w-3/ bg-gray-300 h-0.5 rounded-2xl"> 
        </div>
        {/* Topo */}
        <ul className="space-y-1 mt-3 -ml-3">
            <SidebarItem icon="/dashboard_icon.png" label="Dashboard" href="/" />
            <SidebarItem icon="/user_icon.png" label="Usuários" href="users"/>
            <SidebarItem icon="/projects_icon.png" label="Projetos" href="projects"/>
            <SidebarItem icon="/labelings_icon.png" label="Rotulações" href="labelings"/></ul>

        {/* Rodapé */}
        <div className="text-sm text-gray-500 mt-auto">
          <p>Configurações</p>
          <p>Log-out</p>
        </div>
      </aside>

   
    </div>
  );
}