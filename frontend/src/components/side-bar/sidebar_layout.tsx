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
    <>
      <Sidebar isOpen={isOpen} onToggle={toggle} />
      <div
        className={`
          bg-white transition-all duration-300
          ${isOpen ? "ml-[15vw] min-ml-42 max-ml-84" : "ml-[5vw] min-ml-16 max-ml-64"}
        `}
      >
        {children}
      </div>
    </>
  );
}
