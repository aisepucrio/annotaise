import React from "react";

type GridItemCardProps = {
  /** Elementos filhos a serem renderizados dentro do card */
  children: React.ReactNode;
  /** Índice do item no array  */
  index: number;
  /** Classes CSS adicionais para personalização */
  className?: string;
};

export default function GridItemCard({
  children,
  index,
  className = "",
}: GridItemCardProps) {
  // Alterna entre blueberry-700 (#1e2f93) e blueberry-900 (#0e1862) baseado no índice
  const borderColor =
    index % 2 === 0 ? "var(--blueberry-500)" : "var(--blueberry-700)";

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
        borderTopColor: borderColor,
        borderLeftColor: borderColor,
      }}
    >
      {children}
    </div>
  );
}
