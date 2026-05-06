'use client';

import { ArrowLeft } from 'lucide-react';
import Button from '@/components/button/Button';

interface InnerPageHeaderProps {
  onBack: () => void;
  children?: React.ReactNode;
}

export default function InnerPageHeader({ onBack, children }: InnerPageHeaderProps) {
  return (
    <header className="flex items-center bg-blueberry-700 px-6 py-4 text-white shadow-md">
      <div className="flex items-center gap-3 w-full">
        <Button
          variant="light"
          fill={false}
          size="icon"
          onClick={onBack}
          className="flex items-center justify-center bg-white/20 hover:bg-white/30"
          aria-label="Voltar"
        >
          <ArrowLeft size={22} />
        </Button>
        <div className="flex-1 flex items-center justify-between">{children}</div>
      </div>
    </header>
  );
}
