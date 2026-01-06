"use client";

import { useState, useEffect, ReactNode } from "react";
import Modal from "@/components/modal/Modal";
import Button from "@/components/button/Button";
import Input from "@/components/form/Input";

interface ConfirmDeleteModalProps {
  /** Controla a visibilidade do modal */
  open: boolean;
  /** Função chamada ao fechar o modal */
  onClose: () => void;
  /** Função chamada ao confirmar a exclusão */
  onConfirm: () => void;
  /** Indica se a operação de exclusão está em andamento */
  isDeleting: boolean;
  /** Título do modal */
  title: string;
  /** Nome do item que será deletado (usado para validação) */
  itemName: string;
  /** Descrição/alerta sobre a exclusão */
  description?: ReactNode;
  /** Texto do botão de confirmar (padrão: "Excluir") */
  confirmButtonText?: string;
  /** Texto do botão de cancelar (padrão: "Cancelar") */
  cancelButtonText?: string;
}

/**
 * Modal de confirmação de exclusão com input de verificação.
 * Requer que o usuário digite o nome exato do item para habilitar o botão de exclusão.
 */
export default function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  isDeleting,
  title,
  itemName,
  description = "Você tem certeza que deseja excluir este item?",
  confirmButtonText = "Excluir",
  cancelButtonText = "Cancelar",
}: ConfirmDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("");

  // Limpa o input quando o modal fecha
  useEffect(() => {
    if (!open) {
      setConfirmText("");
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
        {/* Descrição */}
        <div className="text-sm text-metal-700">{description}</div>

        {/* Input de confirmação */}
        <div className="space-y-2">
          <p className="text-sm text-metal-700">
            Digite <strong className="text-metal-900">{itemName}</strong> para
            confirmar:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={itemName}
            disabled={isDeleting}
            autoComplete="off"
          />
        </div>

        {/* Botões de ação */}
        <div className="flex justify-between gap-3 pt-2">
          <Button
            onClick={onClose}
            disabled={isDeleting}
            fill={true}
            variant="white"
          >
            {cancelButtonText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isConfirmValid || isDeleting}
            fill={true}
            variant="red"
          >
            {isDeleting ? "Excluindo..." : confirmButtonText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
