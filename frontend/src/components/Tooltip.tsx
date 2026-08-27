import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip as TooltipPrimitive } from './ui/tooltip';

type TooltipSize = 'sm' | 'md' | 'lg';

type TooltipProps = {
  content: string;
  color?: string;
  size?: TooltipSize;
  icon?: React.ReactNode;
  className?: string;
};

export default function Tooltip({ content, color = 'white', size = 'md', icon, className = '' }: TooltipProps) {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return { container: 'h-6 w-6', iconSize: 16 };
      case 'lg':
        return { container: 'h-10 w-10', iconSize: 24 };
      case 'md':
      default:
        return { container: 'h-8 w-8', iconSize: 20 };
    }
  };

  const { container, iconSize } = getSizeClasses();

  return (
    <TooltipPrimitive content={content}>
      <span
        className={`flex items-center justify-center rounded-full cursor-default hover:bg-white/10 hover:opacity-80 transition ${container} ${className}`}
        style={{ color }}
      >
        {icon || <Info size={iconSize} strokeWidth={2.25} />}
      </span>
    </TooltipPrimitive>
  );
}
