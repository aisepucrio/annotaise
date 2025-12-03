"use client";

import { useState, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Sidebar from "./sidebar";
import { useSidebarState } from "./sidebar_provider";

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const sidebar = useSidebarState();
  const [localOpen, setLocalOpen] = useState(true);

  const isOpen = sidebar?.isOpen ?? localOpen;
  const toggle = sidebar?.toggle ?? (() => setLocalOpen((prev) => !prev));

  return (
    <div className="bg-gray-300 min-h-screen">
      <Sidebar isOpen={isOpen} />
      <div
        className={`
          bg-white min-h-screen p-4 transition-all duration-300
          ${isOpen ? "ml-64" : ""}
        `}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={isOpen ? "Ocultar menu lateral" : "Mostrar menu lateral"}
          aria-expanded={isOpen}
          className="
            mb-3
            inline-flex items-center gap-2
            rounded-lg border border-gray-200 bg-gray-50
            px-3 py-2 text-sm font-medium text-gray-700
            shadow-sm transition hover:bg-gray-100
          "
        >
          {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          <span className="hidden sm:inline">
            {isOpen ? "Ocultar menu" : "Mostrar menu"}
          </span>
        </button>

        {children}
      </div>
    </div>
  );
}
