"use client";

import Image from "next/image"; // mantem para o LOGO
import SidebarItem from "./sidebar_item";
import {
  Home,
  Users,
  FolderKanban,
  Tags,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthActions } from "@/lib/authClient";
import useCurrent from "@/hooks/current_user_hook";
import { BookmarkPlus } from "lucide-react";


interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const router = useRouter();
  const { removeTokens } = AuthActions();
  const currentUser = useCurrent();
  const isAdmin = Boolean(
    currentUser?.is_staff || currentUser?.account_type === "admin"
  );
  const canSeeProjects = Boolean(
    currentUser &&
      (currentUser.is_staff || currentUser.account_type !== "standard")
  );

  const handleLogout = () => {
    removeTokens();
    router.push("/login");
  };

  return (
    <div className="flex">
      <aside
        className={`
          fixed top-0 left-0 h-screen
          bg-white
          shadow-xl
          rounded-r-l
          flex flex-col
          justify-between
          transition-all duration-300
          ${isOpen ? "w-64 p-6" : "w-16 p-4 items-center"}
        `}
      >
        <div
          className={`
            flex items-center w-full mb-6
            ${isOpen ? "justify-between" : "justify-center"}
          `}
        >
          {isOpen ? (
            <Image
              src="/light_theme_logo.png"
              alt="Logo"
              width={180}
              height={32}
              className="shrink-0"
            />
          ) : null}
          
        </div>

        {/* separador */}
        <div className="w-full bg-gray-300 h-0.5 rounded-2xl" />

        {/* Topo */}
        <ul className="space-y-1 mt-3 w-full">
          <SidebarItem
            icon={<Home size={18} />}
            label="Dashboard"
            href="/"
            alias="/"
            hover_color="blue"
            collapsed={!isOpen}
          />
          {isAdmin ? (
            <SidebarItem
              icon={<Users size={18} />}
              label="Usuarios"
              href="/users"
              alias="/users"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          {canSeeProjects ? (
            <SidebarItem
              icon={<FolderKanban size={18} />}
              label="Projetos"
              href="/projects"
              alias="/projects"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          {isAdmin ? (
            <SidebarItem
              icon={<BookmarkPlus size={18} />}
              label="Gerenciar Rotulações"
              href="/labelings/manage"
              alias="/labelings/manage"
              hover_color="blue"
              collapsed={!isOpen}
            />
          ) : null}
          <SidebarItem
            icon={<Tags size={18} />}
            label="Rotular"
            href="/labelings"
            alias="/labelings"
            hover_color="blue"
            collapsed={!isOpen}
          />
          
        </ul>

        {/* Rodape */}
        <div className="text-sm text-gray-500 mt-auto w-full space-y-1">
          <SidebarItem
            icon={<Settings size={18} />}
            label="Configurações"
            href="/options"
            alias="/options"
            hover_color="gray"
            collapsed={!isOpen}
          />
          <button type="button" className="text-sm text-gray-500 mt-auto w-full space-y-1" onClick={handleLogout}>
            <SidebarItem
              icon={<LogOut size={18} />}
              label="Logout"
              href="/login"
              alias="/logout"
              hover_color="red"
              collapsed={!isOpen}
            />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={isOpen ? "Minimizar menu lateral" : "Expandir menu lateral"}
            className=" ml-auto
              flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50
              p-2 text-gray-600 hover:bg-gray-100 transition shadow-sm
            "
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>
      </aside>
    </div>
  );
}
