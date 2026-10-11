'use client';

import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Default: "md". */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  disableBackdropClick?: boolean;
  hideCloseButton?: boolean;
  className?: string;
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  description,
  children,
  maxWidth = 'md',
  disableBackdropClick = false,
  hideCloseButton = false,
  className = '',
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={() => !disableBackdropClick && onClose()} />

      <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`w-full ${maxWidthClasses[maxWidth]} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] p-5 ${className}`}
          style={{ backgroundColor: 'var(--full-white)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative shrink-0">
            <h2 className="text-xl font-semibold text-left" style={{ color: 'var(--metal-900)' }}>
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                className="absolute -right-1 -top-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: 'rgba(203, 206, 217, 0.2)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--metal-100)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(203, 206, 217, 0.2)';
                }}
              >
                <X size={18} style={{ color: 'var(--metal-500)' }} />
              </button>
            )}
          </div>

          {subtitle && (
            <div className="py-3 text-left shrink-0">
              <div className="text-md font-medium" style={{ color: 'var(--metal-700)' }}>
                {subtitle}
              </div>
            </div>
          )}

          {description && (
            <div className=" py-2 text-left shrink-0">
              <div className="text-sm" style={{ color: 'var(--metal-500)' }}>
                {description}
              </div>
            </div>
          )}

          <div className="flex min-h-0 ">
            <div className="pt-4 pr-2 overflow-y-auto flex-1 hide-scrollbar-arrows">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
