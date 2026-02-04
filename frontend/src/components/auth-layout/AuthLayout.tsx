//* Este componente é a base usada para layouts de autenticação (login, registro, etc) */

"use client";

import Image from "next/image";
import React from "react";

type AuthLayoutProps = {
  title: string | undefined;
  subtitle: string | undefined;
  children: React.ReactNode;
};

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="bg-metal-50 p-2 min-h-screen text-base sm:text-lg ">
      {/* Logo responsiva */}
      <div className="relative mx-auto w-[80%] sm:w-[55%] md:w-[45%] aspect-49/10">
        <Image
          src="/Full_Logo_Light.svg"
          alt="Logo"
          fill
          className="object-contain drop-shadow-[0_6px_3px_rgba(0,0,0,0.25)]"
        />
      </div>

      {/* Card responsivo */}
      <div className="mt-[2vh] w-[90%] sm:w-[70%] md:w-[60%] lg:w-[40%] xl:w-[30%] mx-auto bg-white p-8 sm:p-8 rounded-xl shadow-[0_4px_10px_rgba(0,0,0,0.12),0_10px_30px_rgba(0,0,0,0.08)]">
        {/* Cabeçalho: título + descrição */}
        <div className="flex flex-col gap-0 items-center font-montserrat">
          <h2 className="text-3xl sm:text-3xl font-semibold mb-3 text-center text-blueberry-900">
            {title}
          </h2>
          <span className="text-gray-600 text-center text-base sm:text-md">
            {subtitle}
          </span>
        </div>

        {/* Conteúdo (formulários, etc) */}
        {children}
      </div>
    </div>
  );
}
