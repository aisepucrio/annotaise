'use client';

import { useEffect, useState, ReactNode } from 'react';
import Modal from '@/components/Modal';
import Button from '@/components/button/Button';
import Input from '@/components/form/Input';
import { useTranslations } from '@/i18n/use-translations';

interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
  title: string;
  /** Name of the item being deleted; used to validate the confirmation input. */
  itemName: string;
  description?: ReactNode;
  /** Confirm button label (default: translated "Delete"). */
  confirmButtonText?: string;
  /** Cancel button label (default: translated "Cancel"). */
  cancelButtonText?: string;
}

/**
 * Delete-confirmation modal with a verification input.
 * Requires the user to type the item's exact name to enable the confirm button.
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

  // Clear the confirmation input so it doesn't persist across the next open.
  useEffect(() => {
    if (!open) {
      setConfirmText('');
    }
  }, [open]);

  const isConfirmValid = confirmText === itemName;

  const handleConfirm = () => {
    if (isConfirmValid && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="text-sm text-metal-700">{resolvedDescription}</div>

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
