import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import Button from './Button';

type DeleteIconButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
  fill?: boolean;
  size?: 'normal' | 'icon';
};

export default function DeleteIconButton({
  onClick,
  disabled = false,
  ariaLabel,
  className = 'p-2.5',
  children,
  fill = false,
  size,
}: DeleteIconButtonProps) {
  const resolvedSize = size ?? (children ? 'normal' : 'icon');

  return (
    <Button
      type="button"
      variant="red"
      fill={fill}
      size={resolvedSize}
      onClick={onClick}
      disabled={disabled}
      icon={<Trash2 size={16} />}
      ariaLabel={ariaLabel}
      className={className}
    >
      {children}
    </Button>
  );
}
