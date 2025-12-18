import React, { forwardRef, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import FormFieldBase from "./base/FormFieldBase";
import { formFieldClasses } from "./base/formFieldClasses";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** Label do input */
  label?: string;
  /** Mensagem de erro */
  error?: string;
  /** Ícone à direita do input */
  icon?: ReactNode;
  /** Ícone à esquerda do input */
  leftIcon?: ReactNode;
  /** Se o campo é obrigatório */
  required?: boolean;
  /** Classes CSS adicionais para o container */
  containerClassName?: string;
  /** Se true, renderiza um textarea ao invés de input */
  multiline?: boolean;
  /** Número de linhas do textarea (quando multiline=true) */
  rows?: number;
  /** Se o textarea pode ser redimensionado (quando multiline=true). Padrão: false */
  resizable?: boolean;
};

/**
 * Componente de Input padronizado com label flutuante e suporte para ícones
 * Suporta modo textarea com opções de redimensionamento
 */
const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      leftIcon,
      required = false,
      className = "",
      containerClassName = "",
      id,
      disabled = false,
      multiline = false,
      rows = 4,
      resizable = false,
      ...props
    },
    ref
  ) => {
    const baseClasses = cn(
      formFieldClasses.base,
      formFieldClasses.placeholder,
      formFieldClasses.getBorderColor(!!error),
      formFieldClasses.disabled,
      leftIcon && "pl-11",
      icon && "pr-11",
      !resizable && multiline && "resize-none",
      className
    );

    return (
      <FormFieldBase
        label={label}
        id={id}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          {leftIcon && !multiline && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-200">
              {leftIcon}
            </div>
          )}

          {multiline ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              id={id}
              disabled={disabled}
              rows={rows}
              className={baseClasses}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={id}
              disabled={disabled}
              className={baseClasses}
              {...props}
            />
          )}

          {icon && !multiline && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-metal-200">
              {icon}
            </div>
          )}
        </div>
      </FormFieldBase>
    );
  }
);

Input.displayName = "Input";

export default Input;
