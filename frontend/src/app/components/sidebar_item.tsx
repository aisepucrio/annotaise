"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItemProps {
  icon: string;
  label: string;
  href: string;
  alias: string; // esse alias serve pra se futuramente o url for mudado, pra nao quebrar a sidebar
}

export default function SidebarItem({ icon, label, href, alias }: SidebarItemProps) {
  const pathname = usePathname();

  // função auxiliar simples pra checar se o link está ativo
  console.log(pathname)
  console.log(alias)
  const isActive = pathname === alias;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 p-2 rounded-xl transition-colors duration-200 cursor-pointer
        ${isActive ? "bg-blue-900 text-white" : "bg-white text-black hover:bg-blue-900 hover:text-white"}
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
