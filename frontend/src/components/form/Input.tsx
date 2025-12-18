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
};

/**
 * Componente de Input padronizado com label flutuante e suporte para ícones
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
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
      ...props
    },
    ref
  ) => {
    return (
      <FormFieldBase
        label={label}
        id={id}
        error={error}
        required={required}
        className={containerClassName}
      >
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-metal-200">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            className={cn(
              formFieldClasses.base,
              formFieldClasses.placeholder,
              formFieldClasses.getBorderColor(!!error),
              formFieldClasses.disabled,
              leftIcon && "pl-11",
              icon && "pr-11",
              className
            )}
            {...props}
          />

          {icon && (
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
