import React from 'react';

type GridLayoutProps = {
  children: React.ReactNode;
  minColumnWidth?: string;
  className?: string;
};

export default function GridLayout({ children, minColumnWidth = '400px', className = '' }: GridLayoutProps) {
  return (
    <div
      className={`grid gap-4 w-full ${className}`}
      // auto-fill, not auto-fit: empty tracks are kept, so a lone card keeps the width
      // it would have had in a full row instead of stretching edge-to-edge.
      style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(${minColumnWidth}, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}
