import React from "react";

type LoaderProps = {
  variant?: "white" | "blue";
};

/**
 * Componente de loading spinner que se adapta ao tamanho do container pai
 * Centraliza automaticamente e usa cores do design system
 */

export default function Loader({ variant = "blue" }: LoaderProps) {
  const colorClass =
    variant === "white" ? "border-metal-50" : "border-blueberry-700";
  const dotClass = variant === "white" ? "bg-metal-50" : "bg-blueberry-700";

  return (
    <div className="flex items-center justify-center w-full h-full min-h-[100px]">
      <div className="relative w-[25%] h-[25%] min-w-[40px] min-h-[40px] max-w-[80px] max-h-[80px]">
        {/* Trilho */}
        <div
          className={`absolute inset-0 rounded-full border-4 ${colorClass} opacity-20`}
        />

        {/* Spinner */}
        <div
          className={`
            absolute inset-0 rounded-full border-4 border-t-transparent ${colorClass}
            animate-spin motion-reduce:animate-none
            [animation-duration:0.8s]
          `}
        />

        {/* Ponteiro */}
        <div
          className={`
            absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
            h-2 w-2 rounded-full ${dotClass}
            animate-pulse motion-reduce:animate-none
          `}
        />
      </div>
    </div>
  );
}
