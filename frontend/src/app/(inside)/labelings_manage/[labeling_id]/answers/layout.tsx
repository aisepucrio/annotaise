import type { ReactNode } from 'react';

type LayoutProps = {
  children: ReactNode;
};

export default function AnswersLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
