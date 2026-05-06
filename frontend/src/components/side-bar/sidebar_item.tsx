'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const COLORS = {
  blue: 'bg-blueberry-900 text-black hover:bg-blueberry-700  hover:text-white',
  red: 'bg-red-400 text-red-400 hover:bg-red-400 hover:text-white',
  gray: 'bg-metal-400 text-metal-400  hover:bg-metal-400 hover:text-white',
} as const;

type ColorKey = keyof typeof COLORS;

interface SidebarItemProps {
  icon: React.ReactNode; // <— era string (src). Agora é um nó React (ex.: <Home />)
  label: string;
  href: string;
  alias: string;
  hover_color?: string; // mantém validação em runtime
  collapsed?: boolean;
}

export default function SidebarItem({ icon, label, href, alias, hover_color, collapsed = false }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === alias;

  // controla a aparição atrasada do rótulo ao expandir a barra lateral
  const [showLabel, setShowLabel] = useState(!collapsed);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    if (collapsed) {
      // Esconde o rótulo imediatamente ao recolher
      setShowLabel(false);
    } else {
      // Quando expandir, aguarde 300ms antes de mostrar o rótulo
      t = setTimeout(() => setShowLabel(true), 300);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [collapsed]);

  const isValidColor = typeof hover_color === 'string' && Object.prototype.hasOwnProperty.call(COLORS, hover_color);
  const hoverClasses = isValidColor ? COLORS[hover_color as ColorKey] : '';
  const baseActive = isValidColor ? COLORS[hover_color as ColorKey] : COLORS.blue;
  const activeClasses = `${baseActive} text-metal-50`;

  return (
    <Link
      href={href}
      className={`
        flex items-center ${collapsed ? 'justify-center gap-0' : 'gap-3'} p-2 ${
          collapsed ? 'rounded-md ' : 'rounded-r-md pl-6'
        } transition-colors duration-200 cursor-pointer
        ${isActive ? activeClasses : `bg-white text-blueberry-900 ${hoverClasses}`}
      `}
      title={label}
      aria-label={label}
    >
      <div className="w-6 h-6 flex items-center justify-center">{icon}</div>
      <span
        className={`
          text-[0.95rem] font-medium transition-opacity duration-200
          ${showLabel ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}
        `}
      >
        {showLabel ? label : ''}
      </span>
    </Link>
  );
}
