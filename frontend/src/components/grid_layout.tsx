import React from "react";

type GridLayoutProps = {
  /** Elementos filhos a serem renderizados dentro do grid */
  children: React.ReactNode;
  /** Tamanho máximo de cada coluna (ex: "360px", "380px", "400px") */
  minColumnWidth?: string;
  /** Classes CSS adicionais para personalização */
  className?: string;
};

export default function GridLayout({
  children,
  minColumnWidth = "400px",
  className = "",
}: GridLayoutProps) {
  // Conta o número de filhos para determinar o comportamento
  const childCount = React.Children.count(children);
  
  // Se houver apenas 1 item, usa tamanho fixo. Com 2+, permite expansão
  const gridTemplate = childCount === 1 
    ? `minmax(0, ${minColumnWidth})`
    : `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`;

  return (
    <div
      className={`grid gap-4 w-full ${className}`}
      style={{
        gridTemplateColumns: gridTemplate,
      }}
    >
      {children}
    </div>
  );
}
