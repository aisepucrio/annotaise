import React from 'react';

type GridItemCardProps = {
  children: React.ReactNode;
  /** CSS colour for the top spine. Default: the blueberry brand colour. */
  accentColor?: string;
  /** CSS colour for the hairline frame, hover included. Default: the quiet metal frame. */
  borderColor?: string;
  /** CSS width for that frame. Only read when `borderColor` is set. */
  borderWidth?: string;
  /** The spine across the top. Off leaves the frame alone to carry the card. */
  spine?: boolean;
  className?: string;
};

/**
 * Card container for the responsive grids. The blueberry spine across the top is the
 * house style — the same one the folder tiles wear — over a quiet hairline frame.
 */
export default function GridItemCard({
  children,
  accentColor,
  borderColor,
  borderWidth,
  spine = true,
  className = '',
}: GridItemCardProps) {
  return (
    <div
      style={borderColor ? { borderColor, borderWidth } : undefined}
      className={`
        group relative flex h-full flex-col overflow-hidden rounded-2xl border border-metal-100 bg-white
        shadow-sm transition-all duration-200 hover:border-metal-200 hover:shadow-md
        ${className}
      `}
    >
      {spine && (
        <span aria-hidden className="block h-1.5 w-full shrink-0" style={{ backgroundColor: accentColor ?? 'var(--blueberry-700)' }} />
      )}

      <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </div>
  );
}
