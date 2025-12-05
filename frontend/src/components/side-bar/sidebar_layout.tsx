"use client";

import { useState, type ReactNode } from "react";
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
      <Sidebar isOpen={isOpen} onToggle={toggle} />
      <div
        className={`
          bg-white min-h-screen p-4 transition-all duration-300
          ${isOpen ? "ml-64" : "ml-16"}
        `}
      >
        {children}
      </div>
    </div>
  );
}
