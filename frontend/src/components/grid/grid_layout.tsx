import React from "react";

const GridContext = React.createContext(1);

// Contexto para obter o número de colunas no grid e calcular estilos condicionalmente
export const useGridColumns = () => React.useContext(GridContext);

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
  const gridRef = React.useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = React.useState(1);

  const childCount = React.Children.count(children);

  const gridTemplate =
    childCount === 1
      ? `minmax(0, ${minColumnWidth})`
      : `repeat(auto-fit, minmax(min(${minColumnWidth}, 100%), 1fr))`;

  React.useEffect(() => {
    const updateColumns = () => {
      if (!gridRef.current) return;
      const cols = window
        .getComputedStyle(gridRef.current)
        .gridTemplateColumns.split(" ").length;
      setColumnCount(cols);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, [childCount]);

  return (
    <GridContext.Provider value={columnCount}>
      <div
        ref={gridRef}
        className={`grid gap-4 w-full ${className}`}
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {children}
      </div>
    </GridContext.Provider>
  );
}
