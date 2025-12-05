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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthActions } from "@/lib/authClient";
import useCurrent from "@/hooks/current_user_hook";

interface SidebarProps {
  isOpen?: boolean;
}

export default function Sidebar({ isOpen = true }: SidebarProps) {
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
        aria-hidden={!isOpen}
        className={`
          fixed top-0 left-0 h-screen
          w-64
          bg-white
          shadow-xl
          rounded-r-l
          flex flex-col
          justify-between
          p-6
          transition-transform duration-300
          ${isOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"}
        `}
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
          <SidebarItem
            icon={<Home size={18} />}
            label="Dashboard"
            href="/"
            alias="/"
            hover_color="blue"
          />
          {isAdmin ? (
            <SidebarItem
              icon={<Users size={18} />}
              label="Usuarios"
              href="/users"
              alias="/users"
              hover_color="blue"
            />
          ) : null}
          {canSeeProjects ? (
            <SidebarItem
              icon={<FolderKanban size={18} />}
              label="Projetos"
              href="/projects"
              alias="/projects"
              hover_color="blue"
            />
          ) : null}
          <SidebarItem
            icon={<Tags size={18} />}
            label="Rotulações"
            href="/labelings"
            alias="/labelings"
            hover_color="blue"
          />
        </ul>

        {/* Rodape */}
        <div className="text-sm text-gray-500 mt-auto -ml-3 space-y-1">
          <SidebarItem
            icon={<Settings size={18} />}
            label="Configurações"
            href="/options"
            alias="/options"
            hover_color="gray"
          />
          <button type="button" className="w-55" onClick={handleLogout}>
            <SidebarItem
              icon={<LogOut size={18} />}
              label="Logout"
              href="/login"
              alias="/logout"
              hover_color="red"
            />
          </button>
        </div>
      </aside>
    </div>
  );
}
