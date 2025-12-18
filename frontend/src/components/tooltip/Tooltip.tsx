import React from "react";
import { Info } from "lucide-react";
import { Tooltip as TooltipPrimitive } from "../ui/tooltip";

type TooltipSize = "sm" | "md" | "lg";

type TooltipProps = {
  /** Conteúdo do tooltip (texto) */
  content: string;
  /** Cor do ícone (padrão: "white") */
  color?: string;
  /** Tamanho do ícone (padrão: "md") */
  size?: TooltipSize;
  /** Ícone customizado (padrão: Info do lucide-react) */
  icon?: React.ReactNode;
  /** Classes CSS adicionais */
  className?: string;
};

/**
 * Componente de ícone informativo com tooltip
 */
export default function Tooltip({
  content,
  color = "white",
  size = "md",
  icon,
  className = "",
}: TooltipProps) {
  // Define o tamanho do ícone e do container
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return { container: "h-6 w-6", iconSize: 16 };
      case "lg":
        return { container: "h-10 w-10", iconSize: 24 };
      case "md":
      default:
        return { container: "h-8 w-8", iconSize: 20 };
    }
  };

  const { container, iconSize } = getSizeClasses();

  return (
    <TooltipPrimitive content={content}>
      <span
        className={`flex items-center justify-center rounded-full cursor-default hover:bg-white/10 hover:opacity-80 transition ${container} ${className}`}
        style={{ color }}
      >
        {icon || <Info size={iconSize} strokeWidth={2.25} />}
      </span>
    </TooltipPrimitive>
  );
}
