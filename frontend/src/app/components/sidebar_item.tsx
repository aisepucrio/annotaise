"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const COLORS = {
  blue: "bg-blue-900 text-black hover:bg-blue-900 hover:text-white",
  red: "bg-red-900 text-red-400 hover:bg-red-400 hover:text-white",
  gray: "bg-blue-200 text-gray-400 hover:bg-gray-500 hover:text-white",
} as const;

type ColorKey = keyof typeof COLORS;

interface SidebarItemProps {
  icon: string;
  label: string;
  href: string;
  alias: string;
  hover_color?: string; // aceita string (será validada em runtime)
}

export default function SidebarItem({ icon, label, href, alias, hover_color }: SidebarItemProps) {
  const pathname = usePathname();

  const isActive = pathname === alias;

  // valida em runtime se a string corresponde a uma chave válida do dicionário
  const isValidColor = typeof hover_color === "string" && Object.prototype.hasOwnProperty.call(COLORS, hover_color);
  const hoverClasses = isValidColor ? COLORS[hover_color as ColorKey] : "";
  const baseActive = isValidColor ? COLORS[hover_color as ColorKey] : COLORS.blue;
  // garante texto branco quando ativo (mantendo hover classes do dicionário)
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
        <Image
          src={icon}
          alt={label}
          width={20}
          height={20}
          className="object-contain"
        />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}
