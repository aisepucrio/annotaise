'use client';

import { useEffect, useState, ReactNode } from 'react';
import Modal from '@/components/modal/Modal';
import Button from '@/components/button/Button';
import Input from '@/components/form/Input';
import { useTranslations } from '@/i18n/use-translations';

interface ConfirmDeleteModalProps {
  /** Controla a visibilidade do modal */
  open: boolean;
  /** Funcao chamada ao fechar o modal */
  onClose: () => void;
  /** Funcao chamada ao confirmar a exclusao */
  onConfirm: () => void;
  /** Indica se a operacao de exclusao esta em andamento */
  isDeleting: boolean;
  /** Titulo do modal */
  title: string;
  /** Nome do item que sera deletado (usado para validacao) */
  itemName: string;
  /** Descricao/alerta sobre a exclusao */
  description?: ReactNode;
  /** Texto do botao de confirmar (padrao: "Excluir") */
  confirmButtonText?: string;
  /** Texto do botao de cancelar (padrao: "Cancelar") */
  cancelButtonText?: string;
}

/**
 * Modal de confirmacao de exclusao com input de verificacao.
 * Requer que o usuario digite o nome exato do item para habilitar o botao de exclusao.
 */
export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
  title,
  itemName,
  description,
  confirmButtonText,
  cancelButtonText,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslations();
  const [confirmText, setConfirmText] = useState('');
  const resolvedDescription = description ?? t('confirmDelete.description');
  const resolvedConfirmText = confirmButtonText ?? t('common.delete');
  const resolvedCancelText = cancelButtonText ?? t('common.cancel');

  // Limpa o input quando o modal fecha
  useEffect(() => {
    if (!open) {
      setConfirmText('');
    }
  }, [open]);

  // Verifica se o texto digitado corresponde ao nome do item
  const isConfirmValid = confirmText === itemName;

  const handleConfirm = () => {
    if (isConfirmValid && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        {/* Descricao */}
        <div className="text-sm text-metal-700">{resolvedDescription}</div>

        {/* Input de confirmacao */}
        <div className="space-y-2">
          <p className="text-sm text-metal-700">
            {t('confirmDelete.promptPrefix')} <strong className="text-metal-900">{itemName}</strong> {t('confirmDelete.promptSuffix')}
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={itemName}
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        {/* Botoes de acao */}
        <div className="flex justify-between gap-3 pt-2">
          <Button onClick={onClose} disabled={isDeleting} fill={true} variant="white">
            {resolvedCancelText}
          </Button>
          <Button onClick={handleConfirm} disabled={!isConfirmValid || isDeleting} fill={true} variant="red">
            {isDeleting ? t('common.deleting') : resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
