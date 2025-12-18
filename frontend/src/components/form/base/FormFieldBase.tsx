import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

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
};

/**
 * Componente base para todos os campos de formulário
 * Fornece label flutuante, indicador de obrigatório e mensagem de erro
 */
export default function FormFieldBase({
  label,
  id,
  error,
  required = false,
  children,
  className = "",
}: FormFieldBaseProps) {
  return (
    <div className={cn("relative w-full", className)}>
      {label && (
        <label
          htmlFor={id}
          className="absolute -top-3 left-3 bg-white px-2 text-sm text-metal-700 z-10"
        >
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}

      {children}

      {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
    </div>
  );
}
