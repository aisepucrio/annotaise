'use client';

import { useState, type ReactNode } from 'react';
import Sidebar from './sidebar';
import { useSidebarState } from './sidebar_provider';

interface SidebarLayoutProps {
  children: ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  const sidebar = useSidebarState();
  const [localOpen, setLocalOpen] = useState(true);

  const isOpen = sidebar?.isOpen ?? localOpen;
  const toggle = sidebar?.toggle ?? (() => setLocalOpen((prev) => !prev));

  return (
    <div
      className={`
      grid h-screen bg-white
      transition-[grid-template-columns] duration-300
      ${
        isOpen
          ? 'grid-cols-[clamp(10.5rem,15vw,21rem)_1fr]' // 42..84
          : 'grid-cols-[clamp(3.5rem,5vw,4.5rem)_1fr]' // 14..18
      }
    `}
    >
      <div className="h-screen sticky top-0">
        <Sidebar isOpen={isOpen} onToggle={toggle} />
      </div>

      <main className="h-screen min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
