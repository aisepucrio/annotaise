import type { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

export default function FormLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
