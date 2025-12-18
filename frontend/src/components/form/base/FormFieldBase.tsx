import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Tooltip from "@/components/tooltip/Tooltip";

export type FormFieldBaseProps = {
  /** Label do campo */
  label?: string;
  /** ID do campo (para conectar label ao input) */
  id?: string;
  /** Mensagem de erro */
  error?: string;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Conteúdo do campo (input, select, etc) */
  children: ReactNode;
  /** Classes CSS adicionais para o container */
  className?: string;
  /** Tooltip informativo ao lado do label */
  tooltip?: string;
};

/**
 * Componente base para todos os campos de formulário
 * Fornece label flutuante, indicador de obrigatório, tooltip opcional e mensagem de erro
 */
export default function FormFieldBase({
  label,
  id,
  error,
  required = false,
  children,
  className = "",
  tooltip,
}: FormFieldBaseProps) {
  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <div className="absolute -top-3 left-3 bg-white px-2 z-10 flex items-center gap-1">
          <label htmlFor={id} className="text-sm text-metal-700">
            {label}
            {required && <span className="text-red-400 ml-1">*</span>}
          </label>
          {tooltip && (
            <Tooltip content={tooltip} color="var(--metal-700)" size="sm" />
          )}
        </div>
      )}

      {children}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
