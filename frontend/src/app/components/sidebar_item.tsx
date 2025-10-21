"use client";
import Image from "next/image";
import Link from "next/link";

interface SidebarItemProps {
  icon: string;        // caminho da imagem (ex: "/dashboard_logo.png")
  label: string;       // texto (ex: "Dashboard")
  href: string;        // rota (ex: "/dashboard")
}

export default function SidebarItem({ icon, label, href }: SidebarItemProps) {
  return (
    <li>
      <Link
        href={href}
        className="
          flex items-center gap-3
          p-2
          text-black bg-white
          hover:bg-blue-900 hover:text-white
          cursor-pointer
          rounded-xl
          transition-colors duration-200
        "
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
    </li>
  );
}
