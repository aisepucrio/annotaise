"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const COLORS = {
  blue: "bg-blue-900 text-black hover:bg-blue-900 hover:text-white",
  red: "bg-red-900 text-red-400 hover:bg-red-400 hover:text-white",
  gray: "bg-blue-200 text-gray-400 hover:bg-gray-500 hover:text-white",
} as const;

type ColorKey = keyof typeof COLORS;

interface SidebarItemProps {
  icon: React.ReactNode;         // <— era string (src). Agora é um nó React (ex.: <Home />)
  label: string;
  href: string;
  alias: string;
  hover_color?: string;          // mantém validação em runtime
}

export default function SidebarItem({ icon, label, href, alias, hover_color }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = pathname === alias;

  const isValidColor =
    typeof hover_color === "string" && Object.prototype.hasOwnProperty.call(COLORS, hover_color);
  const hoverClasses = isValidColor ? COLORS[hover_color as ColorKey] : "";
  const baseActive = isValidColor ? COLORS[hover_color as ColorKey] : COLORS.blue;
  const activeClasses = `${baseActive} text-white`;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 p-2 rounded-xl transition-colors duration-200 cursor-pointer
        ${isActive ? activeClasses : `bg-white text-black ${hoverClasses}`}
      `}
    >
      <div className="w-6 h-6 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
