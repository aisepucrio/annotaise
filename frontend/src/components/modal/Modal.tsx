"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export type ModalProps = {
  /** Controla a visibilidade do modal*/

  open: boolean;
  /** Função chamada quando o modal deve ser fechado */

  onClose: () => void;
  /** Título principal do modal (sempre visível, alinhado com botão X)  */

  title: ReactNode;
  /** Subtítulo opcional - aparece abaixo do título quando presente */

  subtitle?: ReactNode;
  /** Descrição opcional - aparece abaixo do subtítulo quando presente */

  description?: ReactNode;
  /** Conteúdo principal do modal com scroll automático  */

  children: ReactNode;
  /** Largura máxima do modal. Padrão: "md" */

  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  /** Se true, não fecha o modal ao clicar no backdrop   */

  disableBackdropClick?: boolean;
  /** Se true, esconde o botão X de fechar */

  hideCloseButton?: boolean;
  /** Classe CSS adicional para o container do modal  */

  className?: string;
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  description,
  children,
  maxWidth = "md",
  disableBackdropClick = false,
  hideCloseButton = false,
  className = "",
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={() => !disableBackdropClick && onClose()}
      />

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          className={`w-full ${maxWidthClasses[maxWidth]} rounded-2xl shadow-2xl flex flex-col max-h-[90vh] p-5 ${className}`}
          style={{ backgroundColor: "var(--full-white)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: Título + Botão X */}
          <div className="relative shrink-0">
            <h2
              className="text-xl font-semibold text-left"
              style={{ color: "var(--metal-900)" }}
            >
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                aria-label="Fechar"
                className="absolute -right-1 -top-1 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: "rgba(203, 206, 217, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--metal-100)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    "rgba(203, 206, 217, 0.2)";
                }}
              >
                <X size={18} style={{ color: "var(--metal-500)" }} />
              </button>
            )}
          </div>

          {/* Subtítulo (opcional) */}
          {subtitle && (
            <div className="py-3 text-left shrink-0">
              <div
                className="text-md font-medium"
                style={{ color: "var(--metal-700)" }}
              >
                {subtitle}
              </div>
            </div>
          )}

          {/* Descrição (opcional) */}
          {description && (
            <div className=" py-2 text-left shrink-0">
              <div className="text-sm" style={{ color: "var(--metal-500)" }}>
                {description}
              </div>
            </div>
          )}

          {/* Content com scroll */}
          <div className="flex min-h-0 ">
            <div className="pt-4 pr-2 overflow-y-auto flex-1 hide-scrollbar-arrows">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
