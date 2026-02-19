import React from "react";
import { useGridColumns } from "./GridLayout";

type GridItemCardProps = {
  /** Elementos filhos a serem renderizados dentro do card */
  children: React.ReactNode;
  /** Índice do item no array  */
  index: number;
  /** Cor da borda (CSS color value), quando definida sobrescreve o padrão alternado */
  borderColor?: string;
  /** Classes CSS adicionais para personalização */
  className?: string;
};

export default function GridItemCard({
  children,
  index,
  borderColor,
  className = "",
}: GridItemCardProps) {
  const columnCount = useGridColumns();
  const row = Math.floor(index / columnCount);
  const col = index % columnCount;
  const isEven = (row + col) % 2 === 0;
  const defaultBorderColor = isEven
    ? "var(--blueberry-500)"
    : "var(--blueberry-700)";
  const appliedBorderColor = borderColor ?? defaultBorderColor;

  return (
    <div
      className={`
        relative rounded-br-xl rounded-ss-3xl bg-white shadow-md p-3
        border-t-6
        border-l-6
        hover:shadow-lg
        transition-all duration-300 ease-in-out
        ${className}
      `}
      style={{
        borderTopColor: appliedBorderColor,
        borderLeftColor: appliedBorderColor,
      }}
    >
      {children}
    </div>
  );
}
