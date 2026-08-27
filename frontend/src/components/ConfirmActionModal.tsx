'use client';

import { ReactNode } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/button/Button';
import { useTranslations } from '@/i18n/use-translations';

interface ConfirmActionModalProps {
  /** Controla a visibilidade do modal */
  open: boolean;
  /** Função chamada ao fechar o modal */
  onClose: () => void;
  /** Função chamada ao confirmar a ação */
  onConfirm: () => void;
  /** Indica se a ação está em andamento */
  isLoading: boolean;
  /** Título do modal */
  title: string;
  /** Descrição/alerta sobre a ação */
  description?: ReactNode;
  /** Texto do botão de confirmar */
  confirmButtonText?: string;
  /** Texto do botão de cancelar (padrão: "Cancelar") */
  cancelButtonText?: string;
  /** Variante de cor do botão de confirmar (padrão: "normal") */
  confirmVariant?: 'normal' | 'red' | 'green';
}

/**
 * Modal de confirmação genérico, sem a exigência de digitar o nome do item —
 * usado para ações não-destrutivas que ainda merecem uma confirmação explícita.
 */
export default function ConfirmActionModal({
  open,
  onClose,
  onConfirm,
  isLoading,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
  confirmVariant = 'normal',
}: ConfirmActionModalProps) {
  const { t } = useTranslations();
  const resolvedConfirmText = confirmButtonText ?? t('common.save');
  const resolvedCancelText = cancelButtonText ?? t('common.cancel');

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        {description && <div className="text-sm text-metal-700">{description}</div>}

        <div className="flex justify-between gap-3 pt-2">
          <Button onClick={onClose} disabled={isLoading} fill={true} variant="white">
            {resolvedCancelText}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} fill={true} variant={confirmVariant}>
            {resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}