import React from 'react';

type GridItemCardProps = {
  children: React.ReactNode;
  /** CSS colour for the top spine. Default: the blueberry brand colour. */
  accentColor?: string;
  className?: string;
};

/**
 * Card container for the responsive grids. The blueberry spine across the top is the
 * house style — the same one the folder tiles wear — over a quiet hairline frame.
 */
export default function GridItemCard({ children, accentColor, className = '' }: GridItemCardProps) {
  return (
    <div
      className={`
        group relative flex h-full flex-col overflow-hidden rounded-2xl border border-metal-100 bg-white
        shadow-sm transition-all duration-200 hover:border-metal-200 hover:shadow-md
        ${className}
      `}
    >
      <span aria-hidden className="block h-1.5 w-full shrink-0" style={{ backgroundColor: accentColor ?? 'var(--blueberry-700)' }} />

      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </div>
  );
}
