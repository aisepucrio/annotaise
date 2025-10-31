"use client";
import Image from "next/image";            // mantém para o LOGO
import SidebarItem from "./sidebar_item";
import { Home, Users, FolderKanban, Tags, Settings, LogOut } from "lucide-react";

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
          p-6
        "
      >
        {/* LOGO (continua com next/image) */}
        <Image
          src="/light_theme_logo.png"
          alt="Logo"
          width={220}
          height={40}
          className="mx-auto mb-6"
        />

        {/* separador */}
        <div className="w-3/ bg-gray-300 h-0.5 rounded-2xl" />

        {/* Topo */}
        <ul className="space-y-1 mt-3 -ml-3">
          <SidebarItem icon={<Home size={18} />} label="Dashboard" href="/" alias="/" hover_color="blue" />
          <SidebarItem icon={<Users size={18} />} label="Usuários" href="/users" alias="/users" hover_color="blue" />
          <SidebarItem icon={<FolderKanban size={18} />} label="Projetos" href="/projects" alias="/projects" hover_color="blue" />
          <SidebarItem icon={<Tags size={18} />} label="Rotulações" href="/labelings" alias="/labelings" hover_color="blue" />
        </ul>

        {/* Rodapé */}
        <div className="text-sm text-gray-500 mt-auto -ml-3 space-y-1">
          <SidebarItem icon={<Settings size={18} />} label="Configurações" href="/options" alias="/options" hover_color="gray" />
          <SidebarItem icon={<LogOut size={18} />} label="Logout" href="/logout" alias="/logout" hover_color="red" />
        </div>
      </aside>
    </div>
  );
}
