'use client';

import { ReactNode } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/button/Button';
import { useTranslations } from '@/i18n/use-translations';

type ConfirmModalProps = {
  /** Controla a visibilidade do modal */
  open: boolean;
  /** Função chamada ao fechar/cancelar o modal */
  onClose: () => void;
  /** Função chamada ao confirmar a ação */
  onConfirm: () => void;
  /** Título do modal */
  title: string;
  /** Descrição/alerta sobre a ação */
  description?: ReactNode;
  /** Texto do botão de confirmar (padrão: "Excluir") */
  confirmButtonText?: string;
  /** Texto do botão de cancelar (padrão: "Cancelar") */
  cancelButtonText?: string;
};

/**
 * Modal de confirmação leve, com botões "Cancelar"/"Confirmar".
 * Diferente do ConfirmDeleteModal, não exige que o usuário digite o nome do item.
 */
export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmButtonText,
  cancelButtonText,
}: ConfirmModalProps) {
  const { t } = useTranslations();
  const resolvedConfirmText = confirmButtonText ?? t('common.delete');
  const resolvedCancelText = cancelButtonText ?? t('common.cancel');

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        {description ? <div className="text-sm text-metal-700">{description}</div> : null}

        <div className="flex justify-between gap-3 pt-2">
          <Button onClick={onClose} fill={true} variant="white">
            {resolvedCancelText}
          </Button>
          <Button onClick={handleConfirm} fill={true} variant="red">
            {resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
