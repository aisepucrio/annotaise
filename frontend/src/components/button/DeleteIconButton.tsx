import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import Button from './Button';
import type { ButtonSize } from '@/styles/typography';

type DeleteIconButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  children?: ReactNode;
  fill?: boolean;
  size?: ButtonSize;
};

export default function DeleteIconButton({
  onClick,
  disabled = false,
  ariaLabel,
  className = '',
  children,
  fill = false,
  size,
}: DeleteIconButtonProps) {
  const resolvedSize: ButtonSize = size ?? (children ? 'md' : 'icon');

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
